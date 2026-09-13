import json
import math
import time
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, asdict

@dataclass
class LoRAConfig:
    r: int = 16                    # LoRA rank dimension
    lora_alpha: int = 32           # Scaling factor
    target_modules: List[str] = None  # e.g. ["q_proj", "v_proj"]
    lora_dropout: float = 0.05
    bias: str = "none"
    task_type: str = "CAUSAL_LM"

    def __post_init__(self):
        if self.target_modules is None:
            self.target_modules = ["q_proj", "v_proj", "k_proj", "o_proj"]

@dataclass
class ParameterMetrics:
    total_params: int
    trainable_params: int
    trainable_percent: float
    vram_saved_gb: float

@dataclass
class BenchmarkComparison:
    dataset_name: str
    base_model_accuracy: float
    lora_model_accuracy: float
    accuracy_gain_percent: float
    base_avg_latency_ms: float
    lora_avg_latency_ms: float
    evaluated_samples: int

class LoRAExperimentPipeline:
    """
    Project 10: Fine-Tuning Pipeline with LoRA on a Domain-Specific Dataset.
    Configures parameter-efficient adaptation, calculates parameter reduction,
    evaluates task-specific benchmarks (Base vs LoRA), and packages adapter artifacts.
    """
    # Real published architecture shapes for the models offered in the UI dropdown.
    # Keyed so a model picked in the frontend actually changes the parameter math
    # instead of every model silently being computed against the Llama 8B shape.
    _MODEL_ARCHITECTURE = {
        "llama-3-8b-instruct": {"total_params": 8_030_000_000, "d_model": 4096, "num_layers": 32},
        "mistral-7b-v0.3": {"total_params": 7_240_000_000, "d_model": 4096, "num_layers": 32},
        "gemma-2-9b-it": {"total_params": 9_240_000_000, "d_model": 3584, "num_layers": 42},
    }
    _DEFAULT_ARCHITECTURE = {"total_params": 8_030_000_000, "d_model": 4096, "num_layers": 32}

    def __init__(self, base_model_name: str = "llama-3-8b-instruct"):
        self.base_model_name = base_model_name
        self.default_config = LoRAConfig()

    def compute_parameter_efficiency(self, config: Optional[LoRAConfig] = None) -> ParameterMetrics:
        """Calculates trainable parameters and VRAM footprint savings."""
        cfg = config or self.default_config
        arch = self._MODEL_ARCHITECTURE.get(self.base_model_name, self._DEFAULT_ARCHITECTURE)
        total_params = arch["total_params"]
        d_model = arch["d_model"]
        num_layers = arch["num_layers"]
        # LoRA parameter calculation: 2 * r * d_model * num_layers * len(target_modules)
        lora_params = 2 * cfg.r * d_model * num_layers * len(cfg.target_modules)

        trainable_percent = round((lora_params / total_params) * 100, 3)
        # Full FP16 weights require ~2 bytes/param + optimizer states; scaled
        # proportionally to model size off the original 8.03B-model estimate (30GB).
        vram_saved_gb = round(total_params * (30.0 / 8_030_000_000), 1)

        return ParameterMetrics(
            total_params=total_params,
            trainable_params=lora_params,
            trainable_percent=trainable_percent,
            vram_saved_gb=vram_saved_gb,
        )

    # Per-base-model zero-shot baseline on the domain task — real systems measure
    # this once per base model before any fine-tuning; here it's a fixed anchor
    # rather than a live measurement, but it does vary by model rather than
    # being one universal constant.
    _BASE_ACCURACY_BY_MODEL = {
        "llama-3-8b-instruct": 0.625,
        "mistral-7b-v0.3": 0.610,
        "gemma-2-9b-it": 0.605,
    }
    _RANK_REFERENCE = 64  # rank at which capacity gain saturates
    _MAX_CAPACITY_GAIN = 0.34  # accuracy points added at the saturation rank

    def evaluate_benchmark(
        self, config: Optional[LoRAConfig] = None, domain_test_set: Optional[List[Dict]] = None
    ) -> BenchmarkComparison:
        """
        Runs task-specific comparative benchmark between Base Model and LoRA Adapter.
        Simulates evaluation against domain-specific test cases (e.g. enterprise JSON schemas).

        The LoRA accuracy is a function of the adapter's rank (`config.r`): a higher rank
        gives the adapter more capacity to fit the domain task, with diminishing returns
        approaching `_RANK_REFERENCE` — this is *not* wired to a real training run, but it
        does mean the benchmark actually responds to the rank you configure, instead of
        returning the same numbers regardless of input.
        """
        cfg = config or self.default_config
        test_samples = domain_test_set or [
            {"input": "Extract telemetry error code from log: [ERROR 503 upstream down]", "expected": "503"},
            {"input": "Classify SQL safety: DROP TABLE users;", "expected": "REJECT"},
            {"input": "Extract MRR value from customer record: $4,500/mo enterprise", "expected": "4500"},
            {"input": "Verify citation anchor for line 45 in gateway docs", "expected": "VALID"},
        ]

        base_accuracy = self._BASE_ACCURACY_BY_MODEL.get(self.base_model_name, 0.62)
        rank = max(1, cfg.r)
        capacity_ratio = min(1.0, math.log2(rank) / math.log2(self._RANK_REFERENCE))
        capacity_gain = self._MAX_CAPACITY_GAIN * capacity_ratio
        lora_accuracy = round(min(0.97, base_accuracy + capacity_gain), 4)
        accuracy_gain = round(((lora_accuracy - base_accuracy) / base_accuracy) * 100, 1)

        # Higher rank means more matrix-multiply work per forward pass — modeled as a
        # small, rank-proportional latency tax on top of the base model's latency.
        base_latency = 310.5
        lora_latency = round(base_latency * (1 + 0.003 * rank), 1)

        return BenchmarkComparison(
            dataset_name="enterprise-reliability-telemetry-v1",
            base_model_accuracy=base_accuracy,
            lora_model_accuracy=lora_accuracy,
            accuracy_gain_percent=accuracy_gain,
            base_avg_latency_ms=base_latency,
            lora_avg_latency_ms=lora_latency,
            evaluated_samples=len(test_samples),
        )

    def export_adapter_manifest(self, output_dir: str = "./checkpoints/lora-v1") -> Dict[str, Any]:
        """Packages adapter manifest matching Hugging Face PEFT format."""
        manifest = {
            "base_model_name_or_path": self.base_model_name,
            "peft_type": "LORA",
            "r": self.default_config.r,
            "lora_alpha": self.default_config.lora_alpha,
            "lora_dropout": self.default_config.lora_dropout,
            "target_modules": self.default_config.target_modules,
            "bias": self.default_config.bias,
            "task_type": self.default_config.task_type,
            "created_at": time.time(),
            "metrics": asdict(self.compute_parameter_efficiency()),
        }
        return manifest
