"""
PRISM — Disease Configuration
Central configuration for all disease domains, agents, and subscription tiers.
"""

from .agent_registry import ALL_AGENTS, DISEASE_GROUPS, ALL_COLLECTIONS

# Agent registry - all 25 agents
AGENTS = ALL_AGENTS

# Disease domains with metadata
DISEASE_DOMAINS = DISEASE_GROUPS

# Subscription tiers with limits
SUBSCRIPTION_TIERS = {
    "free": {"diseases": 1, "name": "Free Tier"},
    "basic": {"diseases": 2, "name": "Basic Tier"},
    "premium": {"diseases": 5, "name": "Premium Tier"},
}

# Primary agents (first agent from each domain)
PRIMARY_AGENTS = {
    "CA1": AGENTS["CA1"],  # Cancer Screening
    "DM1": AGENTS["DM1"],  # Diabetes Monitoring
    "CV1": AGENTS["CV1"],  # Cardiovascular Risk
    "MH1": AGENTS["MH1"],  # Mental Health Assessment
    "RS1": AGENTS["RS1"],  # Respiratory Assessment
}