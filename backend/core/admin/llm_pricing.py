"""
PRISM — LLM cost calculator.

Prices are USD per 1M tokens (input / output). Rates can be updated here;
the admin dashboard recomputes totals on every poll so cost changes apply in real time.
"""
from __future__ import annotations

from typing import Dict, Optional, Tuple

from backend.config.settings import get_settings

# USD per 1M tokens — (input, output)
_MODEL_RATES: Dict[str, Tuple[float, float]] = {
    # Anthropic
    "claude-sonnet-4-5":       (3.00, 15.00),
    "claude-sonnet-4":         (3.00, 15.00),
    "claude-3-5-sonnet-latest": (3.00, 15.00),
    "claude-3-5-sonnet":       (3.00, 15.00),
    "claude-3-5-haiku-latest": (0.80, 4.00),
    "claude-3-opus-latest":    (15.00, 75.00),
    # OpenAI
    "gpt-4o":                  (2.50, 10.00),
    "gpt-4o-mini":             (0.15, 0.60),
    "gpt-4-turbo":             (10.00, 30.00),
    "gpt-4":                   (30.00, 60.00),
    "o1":                      (15.00, 60.00),
    "o1-mini":                 (3.00, 12.00),
    # Google
    "gemini-1.5-flash":        (0.075, 0.30),
    "gemini-1.5-pro":          (1.25, 5.00),
    "gemini-2.0-flash":        (0.10, 0.40),
}

_PROVIDER_DEFAULTS: Dict[str, Tuple[float, float]] = {
    "anthropic": (3.00, 15.00),
    "openai":    (2.50, 10.00),
    "google":    (0.075, 0.30),
}

_COST_FORMULA = (
    "Cost (USD) = (prompt_tokens ÷ 1,000,000 × input_rate) + "
    "(completion_tokens ÷ 1,000,000 × output_rate). "
    "Rates are per-model USD/MTok and refresh on each dashboard poll."
)


def _normalize_model(model: str) -> str:
    if not model:
        return ""
    return model.strip().lower().replace("_", "-")


def get_model_rates(model: str, provider: Optional[str] = None) -> Dict:
    """Return input/output USD-per-MTok rates for a model."""
    key = _normalize_model(model)
    if key in _MODEL_RATES:
        inp, out = _MODEL_RATES[key]
        return {"model": model or key, "input_per_mtok": inp, "output_per_mtok": out, "source": "catalog"}

    # Partial match (e.g. claude-sonnet-4-5-20250514)
    for known, rates in _MODEL_RATES.items():
        if key.startswith(known) or known in key:
            inp, out = rates
            return {"model": model, "input_per_mtok": inp, "output_per_mtok": out, "source": "catalog_prefix"}

    prov = (provider or get_settings().llm_provider or "anthropic").lower()
    inp, out = _PROVIDER_DEFAULTS.get(prov, _PROVIDER_DEFAULTS["anthropic"])
    return {
        "model": model or get_settings().llm_model,
        "input_per_mtok": inp,
        "output_per_mtok": out,
        "source": f"provider_default:{prov}",
    }


def compute_call_cost(
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    provider: Optional[str] = None,
) -> Dict:
    """Compute USD cost for a single LLM API call."""
    rates = get_model_rates(model, provider)
    inp_rate = rates["input_per_mtok"]
    out_rate = rates["output_per_mtok"]
    p = max(int(prompt_tokens or 0), 0)
    c = max(int(completion_tokens or 0), 0)
    input_cost = (p / 1_000_000) * inp_rate
    output_cost = (c / 1_000_000) * out_rate
    total = input_cost + output_cost
    return {
        "cost_usd": round(total, 8),
        "input_cost_usd": round(input_cost, 8),
        "output_cost_usd": round(output_cost, 8),
        "prompt_tokens": p,
        "completion_tokens": c,
        "total_tokens": p + c,
        "input_per_mtok": inp_rate,
        "output_per_mtok": out_rate,
        "rate_source": rates["source"],
    }


def cost_formula_description() -> str:
    return _COST_FORMULA


def pricing_catalog() -> Dict[str, Dict]:
    """Expose current rate card for admin UI tooltips."""
    settings = get_settings()
    catalog = {}
    for model, (inp, out) in _MODEL_RATES.items():
        catalog[model] = {
            "input_per_mtok": inp,
            "output_per_mtok": out,
            "formula": _COST_FORMULA,
        }
    catalog["_default"] = {
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        **get_model_rates(settings.llm_model, settings.llm_provider),
        "formula": _COST_FORMULA,
    }
    return catalog
