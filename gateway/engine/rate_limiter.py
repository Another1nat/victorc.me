import time
from typing import Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class RateLimitRule:
    max_rpm: int = 60         # Max Requests Per Minute
    max_tpm: int = 40_000     # Max Tokens Per Minute
    max_budget_usd: float = 100.0  # Spend limit

class TokenBucketLimiter:
    """
    In-memory sliding token bucket rate limiter and budget enforcer.
    Tracks requests per minute (RPM), tokens per minute (TPM), and spend limits per team.

    RPM/TPM windows are intentionally in-memory only (they're 60-second rolling
    windows — persisting them buys nothing and would need Redis for correctness
    across multiple instances anyway). Cumulative spend is different: it's the
    number a real bill would be built on, so when a `persistence` store is
    provided, spend is durable across restarts and shared by every team_id that
    resolves to the same authenticated identity.
    """
    def __init__(self, persistence=None):
        self._requests: Dict[str, list] = {}  # team_id -> list of request timestamps
        self._tokens: Dict[str, list] = {}    # team_id -> list of (timestamp, token_count)
        self._spend: Dict[str, float] = {}    # team_id -> cumulative USD spend (in-memory cache)
        self._spend_loaded: set = set()       # team_ids whose spend has been seeded from persistence
        self.rules: Dict[str, RateLimitRule] = {}
        self.persistence = persistence

    def get_or_create_rule(self, team_id: str, plan: Optional[str] = None) -> RateLimitRule:
        if team_id not in self.rules:
            if plan:
                from engine.auth import PLAN_LIMITS
                limits = PLAN_LIMITS.get(plan)
                if limits:
                    self.rules[team_id] = RateLimitRule(
                        max_rpm=limits.max_rpm, max_tpm=limits.max_tpm, max_budget_usd=limits.max_budget_usd
                    )
            if team_id not in self.rules:
                self.rules[team_id] = RateLimitRule()

        if self.persistence and team_id not in self._spend_loaded:
            self._spend[team_id] = self.persistence.get_cumulative_spend(team_id)
            self._spend_loaded.add(team_id)

        return self.rules[team_id]

    def check_limit(self, team_id: str, estimated_tokens: int = 100) -> Tuple[bool, Optional[str], Dict[str, str]]:
        now = time.time()
        rule = self.get_or_create_rule(team_id)
        window = 60.0

        # Prune old request timestamps
        reqs = self._requests.get(team_id, [])
        reqs = [t for t in reqs if now - t < window]
        self._requests[team_id] = reqs

        # Prune old token timestamps
        toks = self._tokens.get(team_id, [])
        toks = [(t, count) for (t, count) in toks if now - t < window]
        self._tokens[team_id] = toks

        current_rpm = len(reqs)
        current_tpm = sum(count for (_, count) in toks)
        current_spend = self._spend.get(team_id, 0.0)

        remaining_rpm = max(0, rule.max_rpm - current_rpm)
        remaining_tpm = max(0, rule.max_tpm - current_tpm)

        headers = {
            "X-RateLimit-Limit-RPM": str(rule.max_rpm),
            "X-RateLimit-Remaining-RPM": str(remaining_rpm),
            "X-RateLimit-Limit-TPM": str(rule.max_tpm),
            "X-RateLimit-Remaining-TPM": str(remaining_tpm),
            "X-Budget-Used-USD": f"{current_spend:.4f}",
            "X-Budget-Limit-USD": f"{rule.max_budget_usd:.2f}",
        }

        # Check spend budget
        if current_spend >= rule.max_budget_usd:
            return False, f"Team '{team_id}' exceeded budget limit of ${rule.max_budget_usd:.2f}", headers

        # Check RPM
        if current_rpm >= rule.max_rpm:
            return False, f"Rate limit exceeded: {rule.max_rpm} requests/min limit reached for team '{team_id}'", headers

        # Check TPM
        if current_tpm + estimated_tokens > rule.max_tpm:
            return False, f"Token rate limit exceeded: {rule.max_tpm} tokens/min limit reached for team '{team_id}'", headers

        return True, None, headers

    def record_usage(self, team_id: str, tokens: int, cost_usd: float):
        now = time.time()
        if team_id not in self._requests:
            self._requests[team_id] = []
        if team_id not in self._tokens:
            self._tokens[team_id] = []

        self._requests[team_id].append(now)
        self._tokens[team_id].append((now, tokens))
        self._spend[team_id] = self._spend.get(team_id, 0.0) + cost_usd
        if self.persistence:
            self.persistence.add_spend(team_id, cost_usd)

    def get_stats(self, team_id: str) -> Dict:
        now = time.time()
        rule = self.get_or_create_rule(team_id)
        reqs = [t for t in self._requests.get(team_id, []) if now - t < 60.0]
        toks = [c for (t, c) in self._tokens.get(team_id, []) if now - t < 60.0]
        return {
            "team_id": team_id,
            "active_rpm": len(reqs),
            "max_rpm": rule.max_rpm,
            "active_tpm": sum(toks),
            "max_tpm": rule.max_tpm,
            "spend_usd": round(self._spend.get(team_id, 0.0), 4),
            "budget_limit_usd": rule.max_budget_usd,
        }
