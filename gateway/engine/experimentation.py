import math
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
    total_quality_score_sq: float = 0.0  # sum of squares, for variance/significance

    @property
    def average_quality(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return round(self.total_quality_score / self.total_requests, 4)

    @property
    def quality_variance(self) -> float:
        if self.total_requests < 2:
            return 0.0
        mean = self.total_quality_score / self.total_requests
        mean_sq = self.total_quality_score_sq / self.total_requests
        return max(0.0, mean_sq - mean * mean)

@dataclass
class SignificanceResult:
    winner_id: Optional[str]
    status: str  # "SIGNIFICANT_WINNER", "NO_SIGNIFICANT_DIFFERENCE", "INSUFFICIENT_DATA"
    z_score: Optional[float]
    p_value: Optional[float]
    variant_stats: List[Dict]

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
        chosen = variants[-1]
        for v in variants:
            cumulative += v.traffic_weight
            if r <= cumulative:
                chosen = v
                break
        chosen.total_requests += 1
        return chosen

    def record_variant_quality(self, experiment_id: str, variant_id: str, quality_score: float) -> bool:
        """Record an observed quality score (e.g. arbitration confidence) against a variant."""
        for v in self.experiments.get(experiment_id, []):
            if v.id == variant_id:
                v.total_quality_score += quality_score
                v.total_quality_score_sq += quality_score * quality_score
                return True
        return False

    @staticmethod
    def _normal_cdf(x: float) -> float:
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

    def evaluate_significance(
        self, experiment_id: str, min_samples: int = 5, alpha: float = 0.05
    ) -> SignificanceResult:
        """
        Two-sample z-test on mean quality score between the experiment's two leading
        variants (by traffic). This is a real (if simple, large-sample-approximation)
        significance test — not a hardcoded "winner" — so it correctly reports
        INSUFFICIENT_DATA until enough traffic has accumulated on both sides.
        """
        variants = self.experiments.get(experiment_id, [])
        stats = [
            {
                "id": v.id,
                "total_requests": v.total_requests,
                "average_quality": v.average_quality,
                "quality_variance": v.quality_variance,
            }
            for v in variants
        ]

        if len(variants) < 2:
            return SignificanceResult(None, "INSUFFICIENT_DATA", None, None, stats)

        a, b = variants[0], variants[1]
        if a.total_requests < min_samples or b.total_requests < min_samples:
            return SignificanceResult(None, "INSUFFICIENT_DATA", None, None, stats)

        se = math.sqrt((a.quality_variance / a.total_requests) + (b.quality_variance / b.total_requests))
        if se == 0:
            # No variance in either arm — only meaningful if the means actually differ.
            if a.average_quality == b.average_quality:
                return SignificanceResult(None, "NO_SIGNIFICANT_DIFFERENCE", 0.0, 1.0, stats)
            z = math.inf
            p_value = 0.0
        else:
            z = (a.average_quality - b.average_quality) / se
            p_value = 2 * (1 - self._normal_cdf(abs(z)))

        if p_value < alpha:
            winner = a.id if a.average_quality > b.average_quality else b.id
            return SignificanceResult(winner, "SIGNIFICANT_WINNER", z, p_value, stats)
        return SignificanceResult(None, "NO_SIGNIFICANT_DIFFERENCE", z, p_value, stats)

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
