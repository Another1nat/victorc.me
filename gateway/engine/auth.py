"""
API key issuance and verification, and configurable per-tenant rate-limit
tiers. This is a technical demonstration of multi-tenant gateway
infrastructure — not a product for sale or rent; there is no billing here.
Authentication is OFF by default (GATEWAY_REQUIRE_AUTH unset) so the public
portfolio demo keeps working with no setup — this module exists to prove
the multi-tenant story is real and testable, not to force it onto a demo
that was never meant to require sign-up.
"""
import hashlib
import secrets
from dataclasses import dataclass
from typing import Dict, Optional

from engine.persistence import PersistenceStore


@dataclass
class PlanLimits:
    max_rpm: int
    max_tpm: int
    max_budget_usd: float
    label: str


PLAN_LIMITS: Dict[str, PlanLimits] = {
    "free": PlanLimits(max_rpm=60, max_tpm=40_000, max_budget_usd=5.0, label="Free"),
    "pro": PlanLimits(max_rpm=300, max_tpm=200_000, max_budget_usd=100.0, label="Pro"),
    "enterprise": PlanLimits(max_rpm=2000, max_tpm=2_000_000, max_budget_usd=2000.0, label="Enterprise"),
}


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


class AuthManager:
    def __init__(self, store: Optional[PersistenceStore] = None):
        self.store = store or PersistenceStore()

    def create_key(self, team_id: str, plan: str = "free") -> str:
        if plan not in PLAN_LIMITS:
            raise ValueError(f"Unknown plan '{plan}'. Valid plans: {list(PLAN_LIMITS.keys())}")
        raw_key = f"aegis_{secrets.token_urlsafe(32)}"
        self.store.create_api_key(team_id, hash_key(raw_key), plan)
        return raw_key

    def verify_key(self, raw_key: str) -> Optional[Dict[str, object]]:
        if not raw_key:
            return None
        return self.store.verify_api_key_hash(hash_key(raw_key))

    def revoke_key(self, team_id: str) -> bool:
        return self.store.revoke_api_key(team_id)

    def get_status(self, team_id: str) -> Optional[Dict[str, object]]:
        info = self.store.get_key_info(team_id)
        if not info:
            return None
        info["cumulative_spend_usd"] = self.store.get_cumulative_spend(team_id)
        info["limits"] = PLAN_LIMITS.get(info["plan"], PLAN_LIMITS["free"]).__dict__
        return info

    @staticmethod
    def get_plan_limits(plan: str) -> PlanLimits:
        return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
