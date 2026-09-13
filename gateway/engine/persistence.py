"""
Lightweight persistence layer: SQLite-backed storage for API keys and
cumulative per-team spend, so both survive a process restart.

This is the honest, minimum-viable version of "state survives a restart" —
a real multi-instance deployment would need Postgres (for API keys, which
must be consistent across replicas) and Redis (for rate-limit counters,
which need sub-millisecond shared access). SQLite is the right tool for a
single-process service and for making that migration path obvious later:
every method here maps 1:1 onto a table a real database would also have.
"""
import os
import sqlite3
import threading
import time
from typing import Optional, Dict, Any

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "gateway_state.db")


class PersistenceStore:
    def __init__(self, db_path: Optional[str] = None):
        # Precedence: explicit arg > GATEWAY_DB_PATH env (set this in production,
        # pointed at a mounted volume — see Dockerfile) > local dev default.
        self.db_path = db_path or os.getenv("GATEWAY_DB_PATH") or DEFAULT_DB_PATH
        if self.db_path != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()

    def _init_schema(self):
        with self._lock:
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    team_id TEXT PRIMARY KEY,
                    key_hash TEXT UNIQUE NOT NULL,
                    plan TEXT NOT NULL DEFAULT 'free',
                    created_at REAL NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0
                )
            """)
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS team_spend (
                    team_id TEXT PRIMARY KEY,
                    cumulative_spend_usd REAL NOT NULL DEFAULT 0.0,
                    updated_at REAL NOT NULL
                )
            """)
            self._conn.commit()

    # --- API keys ---------------------------------------------------------

    def create_api_key(self, team_id: str, key_hash: str, plan: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO api_keys (team_id, key_hash, plan, created_at, revoked) "
                "VALUES (?, ?, ?, ?, 0) "
                "ON CONFLICT(team_id) DO UPDATE SET key_hash=excluded.key_hash, plan=excluded.plan, revoked=0",
                (team_id, key_hash, plan, time.time()),
            )
            self._conn.commit()

    def verify_api_key_hash(self, key_hash: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            row = self._conn.execute(
                "SELECT team_id, plan, revoked FROM api_keys WHERE key_hash = ?", (key_hash,)
            ).fetchone()
        if not row:
            return None
        return {"team_id": row[0], "plan": row[1], "revoked": bool(row[2])}

    def get_key_info(self, team_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            row = self._conn.execute(
                "SELECT plan, created_at, revoked FROM api_keys WHERE team_id = ?", (team_id,)
            ).fetchone()
        if not row:
            return None
        return {"team_id": team_id, "plan": row[0], "created_at": row[1], "revoked": bool(row[2])}

    def revoke_api_key(self, team_id: str) -> bool:
        with self._lock:
            cur = self._conn.execute("UPDATE api_keys SET revoked = 1 WHERE team_id = ?", (team_id,))
            self._conn.commit()
            return cur.rowcount > 0

    # --- Spend tracking -----------------------------------------------------

    def add_spend(self, team_id: str, amount_usd: float) -> float:
        with self._lock:
            self._conn.execute(
                "INSERT INTO team_spend (team_id, cumulative_spend_usd, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(team_id) DO UPDATE SET cumulative_spend_usd = cumulative_spend_usd + excluded.cumulative_spend_usd, updated_at = excluded.updated_at",
                (team_id, amount_usd, time.time()),
            )
            self._conn.commit()
            row = self._conn.execute(
                "SELECT cumulative_spend_usd FROM team_spend WHERE team_id = ?", (team_id,)
            ).fetchone()
        return row[0] if row else amount_usd

    def get_cumulative_spend(self, team_id: str) -> float:
        with self._lock:
            row = self._conn.execute(
                "SELECT cumulative_spend_usd FROM team_spend WHERE team_id = ?", (team_id,)
            ).fetchone()
        return row[0] if row else 0.0

    def close(self):
        with self._lock:
            self._conn.close()
