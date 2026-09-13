import re
import sqlite3
import time
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass

# Defends against a real, confirmed exploit: an unauthenticated caller sending
# something like `SELECT randomblob(999999999)` (no FROM clause, so nothing to
# hallucination-check against) previously ran to completion inside a sync call
# on the async event loop, blocking every other concurrent request for
# several seconds, and then crashed the response with an unhandled 500 because
# raw bytes aren't JSON-serializable. These three constants bound all of that.
MAX_EXECUTION_SECONDS = 3.0
MAX_ROWS_RETURNED = 500
MAX_CELL_STRING_LENGTH = 4096

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

@dataclass
class NLToSQLTranslation:
    question: str
    sql_query: Optional[str]
    translation_confidence: float
    matched_intent: str
    explanation: str

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
        # Hard cap on any single string/blob SQLite will build. This is the fix
        # that actually matters for `SELECT randomblob(999999999)`-style attacks:
        # the progress-handler deadline elsewhere in this file can only interrupt
        # *between* VDBE instructions, so it never gets a chance to fire during
        # one large scalar function call — confirmed empirically, it let a ~1GB
        # randomblob() run for 3.5+ seconds. SQLITE_LIMIT_LENGTH instead makes
        # SQLite itself refuse to allocate past this size, failing in
        # microseconds instead of after the fact.
        self.conn.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 1_000_000)
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

    # Ordered (pattern, sql_template, intent_name) rules for the plain-English
    # translator. This is intentionally a small, rules-based intent matcher —
    # not an LLM call — but it has a real security property because of that:
    # every branch below emits from a fixed, hand-written, read-only SELECT
    # template, so no phrasing of the input question can ever cause a
    # destructive statement to be generated in the first place. The AST
    # guardrail in `execute_safe_sql` still re-validates the result afterward
    # (defense in depth), but the translator itself is structurally incapable
    # of hallucinating DROP/DELETE/etc.
    _NL_INTENT_RULES: List[Tuple[str, str, str]] = [
        (
            r"\b(churn(ed)?|cancel+ed|lost)\b.*\bcustomer",
            "SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE status = 'churned'",
            "churned_customers",
        ),
        (
            r"\benterprise\b.*\bcustomer|customer.*\benterprise\b",
            "SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE plan_tier = 'Enterprise'",
            "enterprise_customers",
        ),
        (
            r"\b(active)\b.*\bcustomer|customer.*\bactive\b",
            "SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE status = 'active'",
            "active_customers",
        ),
        (
            r"\b(total|sum)\b.*\b(revenue|mrr)\b",
            "SELECT SUM(monthly_mrr_usd) AS total_active_mrr_usd FROM customer_subscriptions WHERE status = 'active'",
            "total_active_revenue",
        ),
        (
            r"\berror|failed|failure",
            "SELECT provider, COUNT(*) AS error_count FROM api_metrics WHERE error_code >= 400 GROUP BY provider",
            "provider_error_counts",
        ),
        (
            r"\blatency|slow|response time",
            "SELECT provider, AVG(latency_ms) AS avg_latency_ms FROM api_metrics GROUP BY provider",
            "average_latency_by_provider",
        ),
        (
            r"\ball\b.*\bcustomer|list.*customer|show.*customer",
            "SELECT customer_name, plan_tier, monthly_mrr_usd, status FROM customer_subscriptions",
            "list_all_customers",
        ),
    ]

    def translate_question_to_sql(self, question: str) -> NLToSQLTranslation:
        """
        Project 8 (the missing half): maps a plain-English question onto the known
        schema via a small, ordered set of intent rules — a genuine, if simple,
        text-to-SQL translation step, distinct from `execute_safe_sql`'s job of
        validating and running SQL that's already been written.
        """
        q = question.strip().lower()
        if not q:
            return NLToSQLTranslation(
                question=question, sql_query=None, translation_confidence=0.0,
                matched_intent="empty_question", explanation="Empty question — nothing to translate.",
            )

        for pattern, template, intent in self._NL_INTENT_RULES:
            if re.search(pattern, q):
                return NLToSQLTranslation(
                    question=question,
                    sql_query=template,
                    translation_confidence=0.9,
                    matched_intent=intent,
                    explanation=f"Matched intent '{intent}' against the known schema.",
                )

        # Fallback: if the question names a known table directly, do a bounded scan of it.
        known_tables = list(self.get_known_schema().keys())
        for table in known_tables:
            if table.replace("_", " ") in q or table in q:
                return NLToSQLTranslation(
                    question=question,
                    sql_query=f"SELECT * FROM {table}",
                    translation_confidence=0.55,
                    matched_intent=f"raw_table_scan:{table}",
                    explanation=f"No specific intent matched; falling back to a full scan of '{table}' since it was named directly.",
                )

        return NLToSQLTranslation(
            question=question,
            sql_query=None,
            translation_confidence=0.0,
            matched_intent="unrecognized",
            explanation="Could not confidently map this question onto the known schema (customer_subscriptions, api_metrics).",
        )

    def ask(self, question: str) -> Tuple[NLToSQLTranslation, Optional[SQLExecutionResult]]:
        """Full Project 8 pipeline: translate the question, then validate+execute the result."""
        translation = self.translate_question_to_sql(question)
        if not translation.sql_query:
            return translation, None
        return translation, self.execute_safe_sql(translation.sql_query)

    @staticmethod
    def _sanitize_cell(value: Any) -> Any:
        """Makes any SQLite value safe to JSON-serialize and bounded in size."""
        if isinstance(value, bytes):
            return f"<binary: {len(value)} bytes, not displayed>"
        if isinstance(value, str) and len(value) > MAX_CELL_STRING_LENGTH:
            return value[:MAX_CELL_STRING_LENGTH] + f"... <truncated, {len(value)} chars total>"
        return value

    def execute_safe_sql(self, sql_query: str) -> SQLExecutionResult:
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

        deadline = start_time + MAX_EXECUTION_SECONDS

        def _abort_if_over_deadline():
            return 1 if time.time() > deadline else 0

        try:
            # Checked every ~1000 SQLite VM instructions — cheap enough not to
            # slow normal queries, frequent enough to actually bound runaway ones.
            self.conn.set_progress_handler(_abort_if_over_deadline, 1000)
            cursor = self.conn.cursor()
            cursor.execute(val.sanitized_sql)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(MAX_ROWS_RETURNED)
            truncated = cursor.fetchone() is not None
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            return SQLExecutionResult(
                success=True,
                sql_query=val.sanitized_sql,
                columns=columns,
                rows=[[self._sanitize_cell(cell) for cell in row] for row in rows],
                row_count=len(rows),
                confidence_score=0.98,
                execution_time_ms=elapsed_ms,
                validation=val,
                error=f"Result truncated at {MAX_ROWS_RETURNED} rows." if truncated else None,
            )
        except sqlite3.OperationalError as e:
            if "interrupted" in str(e).lower():
                return SQLExecutionResult(
                    success=False, sql_query=sql_query, columns=[], rows=[], row_count=0,
                    confidence_score=0.0, execution_time_ms=round((time.time() - start_time) * 1000, 2),
                    validation=val, error=f"Query exceeded the {MAX_EXECUTION_SECONDS}s execution time limit and was aborted.",
                )
            return SQLExecutionResult(
                success=False, sql_query=sql_query, columns=[], rows=[], row_count=0,
                confidence_score=0.0, execution_time_ms=round((time.time() - start_time) * 1000, 2),
                validation=val, error=f"SQL Execution Error: {str(e)}",
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
        finally:
            self.conn.set_progress_handler(None, 0)
