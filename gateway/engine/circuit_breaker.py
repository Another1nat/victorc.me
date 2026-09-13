import time
from enum import Enum
from typing import Dict, Optional

class CircuitState(str, Enum):
    CLOSED = "CLOSED"         # Normal operation: all traffic allowed
    OPEN = "OPEN"             # Provider is failing: traffic is tripped & redirected
    HALF_OPEN = "HALF_OPEN"   # Cooldown period expired: allowing probe request

class CircuitBreaker:
    """
    Production-grade Circuit Breaker for AI Providers.
    Protects downstream applications from cascade failures, outages, and 429 surges.
    """
    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_time_seconds: float = 30.0,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        
        self.failure_counts: Dict[str, int] = {}
        self.last_failure_time: Dict[str, float] = {}
        self.state: Dict[str, CircuitState] = {}

    def get_state(self, provider_name: str) -> CircuitState:
        current_state = self.state.get(provider_name, CircuitState.CLOSED)
        if current_state == CircuitState.OPEN:
            elapsed = time.time() - self.last_failure_time.get(provider_name, 0)
            if elapsed >= self.recovery_time_seconds:
                self.state[provider_name] = CircuitState.HALF_OPEN
                return CircuitState.HALF_OPEN
        return current_state

    def allow_request(self, provider_name: str) -> bool:
        state = self.get_state(provider_name)
        return state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)

    def record_success(self, provider_name: str):
        self.failure_counts[provider_name] = 0
        self.state[provider_name] = CircuitState.CLOSED

    def record_failure(self, provider_name: str):
        now = time.time()
        self.last_failure_time[provider_name] = now
        count = self.failure_counts.get(provider_name, 0) + 1
        self.failure_counts[provider_name] = count

        if count >= self.failure_threshold:
            self.state[provider_name] = CircuitState.OPEN

    def get_provider_status(self, provider_name: str) -> Dict:
        state = self.get_state(provider_name)
        return {
            "provider": provider_name,
            "state": state.value,
            "failures": self.failure_counts.get(provider_name, 0),
            "threshold": self.failure_threshold,
            "seconds_since_last_failure": (
                round(time.time() - self.last_failure_time[provider_name], 1)
                if provider_name in self.last_failure_time
                else None
            ),
        }
