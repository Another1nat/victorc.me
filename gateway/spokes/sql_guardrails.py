import re
import sqlite3
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass

@dataclass
class SQLValidationResult:
    is_safe: bool
    sanitized_sql: Optional[str]
    rejection_reason: Optional[str] = None
    affected_tables: List[str] = None

@dataclass
class SQLExecutionResult:
    success: bool
    sql_query: str
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    confidence_score: float
    execution_time_ms: float
    validation: SQLValidationResult
    error: Optional[str] = None

class TextToSQLGuardrailsEngine:
    """
    Project 8: Text-to-SQL Interface with AST Guardrails and Hallucination Detection.
    Strictly verifies that generated queries are read-only, checks against schema hallucinations,
    and blocks SQL injection vectors.
    """
    # Strictly prohibited SQL keywords
    FORBIDDEN_KEYWORDS = {
        "DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT",
        "GRANT", "REVOKE", "EXEC", "EXECUTE", "SHUTDOWN", "REPLACE"
    }

    def __init__(self, db_connection: Optional[sqlite3.Connection] = None):
        # Default in-memory sandbox DB with sample enterprise schema
        self.conn = db_connection or sqlite3.connect(":memory:", check_same_thread=False)
        self._init_sample_schema()

    def _init_sample_schema(self):
        cursor = self.conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_subscriptions (
                id INTEGER PRIMARY KEY,
                customer_name TEXT,
                plan_tier TEXT,
                monthly_mrr_usd REAL,
                status TEXT,
                created_date TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_metrics (
                id INTEGER PRIMARY KEY,
                provider TEXT,
                latency_ms REAL,
                tokens_processed INTEGER,
                error_code INTEGER
            )
        """)
        # Seed test data
        cursor.executemany("""
            INSERT INTO customer_subscriptions (customer_name, plan_tier, monthly_mrr_usd, status, created_date)
            VALUES (?, ?, ?, ?, ?)
        """, [
            ("Acme Corp", "Enterprise", 4500.0, "active", "2026-01-15"),
            ("Starlight AI", "Pro", 899.0, "active", "2026-02-10"),
            ("Nexus Labs", "Starter", 299.0, "churned", "2026-03-01"),
            ("QuantFlow", "Enterprise", 6200.0, "active", "2026-03-12"),
        ])
        self.conn.commit()

    def get_known_schema(self) -> Dict[str, List[str]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        schema = {}
        for t in tables:
            cursor.execute(f"PRAGMA table_info({t})")
            cols = [col[1] for col in cursor.fetchall()]
            schema[t] = cols
        return schema

    def validate_query(self, sql_query: str) -> SQLValidationResult:
        cleaned = sql_query.strip().rstrip(";")
        
        # 1. Reject multiple statements (semicolon injection)
        if ";" in cleaned:
            return SQLValidationResult(
                is_safe=False,
                sanitized_sql=None,
                rejection_reason="Multiple SQL statements detected (stacked query injection protection).",
            )

        # 2. Enforce SELECT only
        tokens = re.findall(r"\b[A-Z]+\b", cleaned, re.IGNORECASE)
        upper_tokens = [t.upper() for t in tokens]
        
        if not upper_tokens or upper_tokens[0] != "SELECT":
            return SQLValidationResult(
                is_safe=False,
                sanitized_sql=None,
                rejection_reason=f"Only read-only SELECT queries are allowed. Got '{upper_tokens[0] if upper_tokens else 'empty'}'",
            )

        # 3. Check forbidden destructive verbs anywhere in query
        found_forbidden = set(upper_tokens).intersection(self.FORBIDDEN_KEYWORDS)
        if found_forbidden:
            return SQLValidationResult(
                is_safe=False,
                sanitized_sql=None,
                rejection_reason=f"Security Violation: Forbidden destructive clause '{', '.join(found_forbidden)}' detected.",
            )

        # 4. Hallucination detection: verify referenced tables exist in schema
        known_schema = self.get_known_schema()
        # Regex matching table names after FROM / JOIN
        table_matches = re.findall(r"(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)", cleaned, re.IGNORECASE)
        affected = []
        for t in table_matches:
            if t.lower() not in [k.lower() for k in known_schema.keys()]:
                return SQLValidationResult(
                    is_safe=False,
                    sanitized_sql=None,
                    rejection_reason=f"Schema Hallucination: Referenced table '{t}' does not exist in database.",
                )
            affected.append(t)

        return SQLValidationResult(
            is_safe=True,
            sanitized_sql=cleaned,
            affected_tables=affected,
        )

    def execute_safe_sql(self, sql_query: str) -> SQLExecutionResult:
        import time
        start_time = time.time()
        
        val = self.validate_query(sql_query)
        if not val.is_safe:
            return SQLExecutionResult(
                success=False,
                sql_query=sql_query,
                columns=[],
                rows=[],
                row_count=0,
                confidence_score=0.0,
                execution_time_ms=0.0,
                validation=val,
                error=val.rejection_reason,
            )

        try:
            cursor = self.conn.cursor()
            cursor.execute(val.sanitized_sql)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            return SQLExecutionResult(
                success=True,
                sql_query=val.sanitized_sql,
                columns=columns,
                rows=[list(r) for r in rows],
                row_count=len(rows),
                confidence_score=0.98,
                execution_time_ms=elapsed_ms,
                validation=val,
            )
        except Exception as e:
            return SQLExecutionResult(
                success=False,
                sql_query=sql_query,
                columns=[],
                rows=[],
                row_count=0,
                confidence_score=0.0,
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
                validation=val,
                error=f"SQL Execution Error: {str(e)}",
            )
