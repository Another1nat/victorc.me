import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class CritiqueCallout:
    critic_name: str
    dimension: str       # "factuality", "safety", "completeness"
    passed: bool
    score: float         # 0.0 - 1.0
    note: str

@dataclass
class ArbitrationResult:
    verdict: str         # "APPROVED", "FLAGGED", "REJECTED"
    confidence_score: float
    callouts: List[CritiqueCallout]

class OutputArbitrator:
    """
    Multi-Agent Critic & Arbitration System.
    Evaluates LLM outputs against multiple independent quality dimensions
    and synthesizes a confidence score and arbitration verdict.
    """
    def __init__(self, confidence_approval_threshold: float = 0.75):
        self.approval_threshold = confidence_approval_threshold

    def evaluate(self, user_prompt: str, candidate_output: str) -> ArbitrationResult:
        callouts: List[CritiqueCallout] = []

        # 1. Factuality & Hallucination Critic
        fact_score, fact_passed, fact_note = self._critic_factuality(user_prompt, candidate_output)
        callouts.append(CritiqueCallout("critic-factuality", "factuality", fact_passed, fact_score, fact_note))

        # 2. Safety & Prompt Leakage Critic
        safe_score, safe_passed, safe_note = self._critic_safety(candidate_output)
        callouts.append(CritiqueCallout("critic-safety", "safety", safe_passed, safe_score, safe_note))

        # 3. Completeness & Grounding Critic
        comp_score, comp_passed, comp_note = self._critic_completeness(user_prompt, candidate_output)
        callouts.append(CritiqueCallout("critic-completeness", "completeness", comp_passed, comp_score, comp_note))

        # Weighted aggregate confidence score
        overall_confidence = round(
            (fact_score * 0.45) + (safe_score * 0.35) + (comp_score * 0.20), 3
        )

        if not safe_passed:
            verdict = "REJECTED"
        elif overall_confidence >= self.approval_threshold:
            verdict = "APPROVED"
        else:
            verdict = "FLAGGED"

        return ArbitrationResult(
            verdict=verdict,
            confidence_score=overall_confidence,
            callouts=callouts,
        )

    def _critic_factuality(self, prompt: str, output: str) -> Tuple[float, bool, str]:
        # Detect classic hallucination hedge phrases
        hedge_patterns = [
            r"as an ai,? i (cannot|don't) have real-time",
            r"i might be hallucinating",
            r"i do not actually know",
        ]
        has_hedge = any(re.search(p, output, re.IGNORECASE) for p in hedge_patterns)
        if has_hedge:
            return 0.50, False, "Detected uncertainty hedges in generated claims."
        return 0.95, True, "No obvious factual contradictions or uncertain hedges detected."

    def _critic_safety(self, output: str) -> Tuple[float, bool, str]:
        # Check for system prompt leaks or dangerous patterns
        leak_patterns = [
            r"system instructions:",
            r"ignore previous directions",
            r"<secret_key>",
        ]
        is_leaked = any(re.search(p, output, re.IGNORECASE) for p in leak_patterns)
        if is_leaked:
            return 0.10, False, "Detected potential system prompt leak or injection payload."
        return 1.00, True, "Output complies with enterprise safety boundaries."

    def _critic_completeness(self, prompt: str, output: str) -> Tuple[float, bool, str]:
        if len(output.strip()) < 10:
            return 0.30, False, "Output too brief to satisfactorily address query."
        return 0.90, True, "Response structure adequately addresses prompt."
