import random
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass, field

@dataclass
class PromptVariant:
    id: str                    # e.g., "v1.0.0"
    template: str              # System prompt or user prompt template
    traffic_weight: float      # e.g., 0.80 (80% of traffic)
    total_requests: int = 0
    total_quality_score: float = 0.0

    @property
    def average_quality(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return round(self.total_quality_score / self.total_requests, 4)

@dataclass
class CanaryFeatureFlag:
    flag_key: str              # e.g., "new-reasoning-engine"
    is_enabled: bool = True
    rollout_percentage: float = 10.0   # 10%
    quality_threshold: float = 0.80    # Auto-rollback threshold
    baseline_variant: str = "baseline"
    canary_variant: str = "canary"
    rolled_back: bool = False
    rollback_reason: Optional[str] = None
    canary_scores: List[float] = field(default_factory=list)

class ExperimentationEngine:
    """
    Manages prompt A/B testing variants and canary rollouts with automated quality rollbacks.
    """
    def __init__(self):
        self.experiments: Dict[str, List[PromptVariant]] = {}
        self.feature_flags: Dict[str, CanaryFeatureFlag] = {}

    def register_experiment(self, experiment_id: str, variants: List[PromptVariant]):
        # Normalize weights to sum to 1.0
        total_w = sum(v.traffic_weight for v in variants)
        if total_w > 0:
            for v in variants:
                v.traffic_weight = v.traffic_weight / total_w
        self.experiments[experiment_id] = variants

    def register_feature_flag(self, flag: CanaryFeatureFlag):
        self.feature_flags[flag.flag_key] = flag

    def select_prompt_variant(self, experiment_id: str) -> Optional[PromptVariant]:
        variants = self.experiments.get(experiment_id)
        if not variants:
            return None

        # Weighted random selection
        r = random.random()
        cumulative = 0.0
        for v in variants:
            cumulative += v.traffic_weight
            if r <= cumulative:
                v.total_requests += 1
                return v
        return variants[-1]

    def evaluate_canary(self, flag_key: str, user_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Determine if request gets canary variant.
        Returns: (is_canary: bool, assigned_variant: str)
        """
        flag = self.feature_flags.get(flag_key)
        if not flag or not flag.is_enabled:
            return False, "disabled"

        if flag.rolled_back:
            return False, flag.baseline_variant

        # Percentage rollout determination
        r = random.uniform(0.0, 100.0)
        if r <= flag.rollout_percentage:
            return True, flag.canary_variant
        return False, flag.baseline_variant

    def record_canary_quality(self, flag_key: str, quality_score: float) -> bool:
        """
        Record quality score for canary.
        Triggers automatic rollback if moving average drops below threshold.
        Returns True if rollback was triggered.
        """
        flag = self.feature_flags.get(flag_key)
        if not flag or flag.rolled_back:
            return False

        flag.canary_scores.append(quality_score)
        # Check moving average over last 5 requests
        if len(flag.canary_scores) >= 3:
            window = flag.canary_scores[-5:]
            avg_score = sum(window) / len(window)
            if avg_score < flag.quality_threshold:
                flag.rolled_back = True
                flag.rollback_reason = (
                    f"Automated Rollback: Canary quality score ({avg_score:.2f}) "
                    f"dropped below threshold ({flag.quality_threshold:.2f})."
                )
                return True
        return False
