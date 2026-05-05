"""
PRISM — Pre-RAG Readiness Gate (19-Dimension Scoring)
Tier 1: 9 Guardrail Checkpoints (max 40 pts)
Tier 2: 10 Evidence Quality Dimensions (max 60 pts)
Total: 100 pts → GOLD ≥85 | SILVER 70-84 | BORDERLINE 55-69 | REJECTED <55
"""
import re
import hashlib
from datetime import datetime
from typing import Dict, List, Tuple
from dataclasses import dataclass, field


@dataclass
class PreRAGScore:
    doc_title:      str
    agent_id:       str
    # Tier 1
    g1_data_quality:    float = 0.0
    g2_duplicate:       float = 0.0
    g3_copyright:       float = 0.0
    g4_freshness:       float = 0.0
    g5_pdf_quality:     float = 0.0
    g6_coverage:        float = 0.0
    g7_pii:             float = 0.0
    g8_offensive:       float = 0.0
    g9_metadata:        float = 0.0
    # Tier 2
    d1_source_authority: float = 0.0
    d2_evidence_grade:   float = 0.0
    d3_peer_review:      float = 0.0
    d4_recency:          float = 0.0
    d5_latam_relevance:  float = 0.0
    d6_clinical_spec:    float = 0.0
    d7_sample_size:      float = 0.0
    d8_completeness:     float = 0.0
    d9_coi:              float = 0.0
    d10_citation_impact: float = 0.0
    # Results
    tier1_total:    float = 0.0
    tier2_total:    float = 0.0
    total_score:    float = 0.0
    quality_std:    str   = "PENDING"
    auto_rejected:  bool  = False
    reject_reasons: List[str] = field(default_factory=list)
    pii_instances:  int   = 0

    def to_dict(self) -> Dict:
        return {
            "doc_title": self.doc_title, "agent_id": self.agent_id,
            "tier1": {"G1": self.g1_data_quality, "G2": self.g2_duplicate, "G3": self.g3_copyright,
                      "G4": self.g4_freshness, "G5": self.g5_pdf_quality, "G6": self.g6_coverage,
                      "G7": self.g7_pii, "G8": self.g8_offensive, "G9": self.g9_metadata,
                      "total": self.tier1_total},
            "tier2": {"D1": self.d1_source_authority, "D2": self.d2_evidence_grade, "D3": self.d3_peer_review,
                      "D4": self.d4_recency, "D5": self.d5_latam_relevance, "D6": self.d6_clinical_spec,
                      "D7": self.d7_sample_size, "D8": self.d8_completeness, "D9": self.d9_coi,
                      "D10": self.d10_citation_impact, "total": self.tier2_total},
            "total_score": self.total_score, "quality_standard": self.quality_std,
            "auto_rejected": self.auto_rejected, "reject_reasons": self.reject_reasons,
        }


AUTHORITATIVE_SOURCES = {
    "who", "world health organization", "ncbi", "pubmed", "nih", "cdc", "fda",
    "ema", "nccn", "asco", "ada", "acc", "aha", "apa", "nice", "esmo",
    "paho", "ops", "inca", "incan", "imss", "sus", "anvisa",
    "nejm", "lancet", "jama", "bmj", "annals", "nature medicine",
    "diabetes care", "circulation", "journal of clinical oncology",
}

CLINICAL_TERMS = [
    "diagnosis", "treatment", "therapy", "clinical", "patient", "dose", "mg",
    "mmol", "hba1c", "glucose", "blood pressure", "cardiac", "cancer", "tumor",
    "medication", "drug", "surgery", "prognosis", "protocol", "guideline",
    "randomized", "trial", "cohort", "meta-analysis", "systematic review",
    "efficacy", "safety", "adverse", "contraindication", "indication",
]

LATAM_TERMS = [
    "latin america", "mexico", "brazil", "colombia", "argentina", "peru", "chile",
    "venezuela", "ecuador", "bolivia", "latam", "hispanic", "latino", "paho", "ops",
    "imss", "sus", "inca", "inss", "fonasa", "seguro", "española", "español",
]

PII_PATTERNS = [
    r'\b\d{3}-\d{2}-\d{4}\b',           # SSN
    r'\b[A-Z]{2}\d{6}[A-Z]\d{2}\b',     # CURP Mexico
    r'\b\d{11}\b',                        # CPF Brazil
    r'\bpatient\s+name\s*:\s*\w+',
    r'\bDOB\s*:\s*\d',
]

OFFENSIVE_TERMS = [
    "racist", "nazi", "terrorist", "violence against", "suicide method",
    "self-harm method", "how to make", "illegal drug synthesis",
]

_seen_hashes: set = set()


class PRISMPreRAGGate:
    def evaluate(self, text: str, metadata: Dict) -> PreRAGScore:
        title   = metadata.get("source", "Unknown")
        agent   = metadata.get("agent_scope", "UNKNOWN")
        tl      = text.lower()
        words   = text.split()
        score   = PreRAGScore(doc_title=title, agent_id=agent)
        rejects = []

        # ── TIER 1: GUARDRAILS ─────────────────────────────────────────

        # G1 Data Quality (7pts) — length, language, readability
        if len(words) >= 500:   score.g1_data_quality = 7.0
        elif len(words) >= 200: score.g1_data_quality = 5.0
        elif len(words) >= 100: score.g1_data_quality = 3.0
        else: score.g1_data_quality = 0.0

        # G2 Duplicate Check (5pts)
        doc_hash = hashlib.md5(text[:1000].encode()).hexdigest()
        if doc_hash in _seen_hashes:
            score.g2_duplicate = 0.0
            rejects.append("AUTO-REJECT: Duplicate document detected")
        else:
            _seen_hashes.add(doc_hash)
            score.g2_duplicate = 5.0

        # G3 Copyright (4pts)
        copyright_signals = ["© all rights reserved", "proprietary", "do not distribute", "confidential"]
        if any(c in tl for c in copyright_signals):
            score.g3_copyright = 0.0
            rejects.append("AUTO-REJECT: Copyright violation — proprietary content")
        else:
            score.g3_copyright = 4.0

        # G4 Freshness (4pts)
        year_match = re.findall(r'\b(20\d{2})\b', text)
        if year_match:
            latest = max(int(y) for y in year_match)
            age = datetime.now().year - latest
            score.g4_freshness = 4.0 if age <= 2 else 3.0 if age <= 4 else 2.0 if age <= 7 else 1.0
        else:
            score.g4_freshness = 1.0

        # G5 PDF/File Quality (4pts)
        garbled = len(re.findall(r'[^\x00-\x7F]', text)) / max(len(text), 1)
        score.g5_pdf_quality = 4.0 if garbled < 0.05 else 3.0 if garbled < 0.15 else 1.0

        # G6 Coverage (6pts)
        domain_kw_hits = sum(1 for t in CLINICAL_TERMS if t in tl)
        score.g6_coverage = min(6.0, domain_kw_hits * 0.5)

        # G7 PII Detection (4pts)
        pii_hits = sum(len(re.findall(p, text, re.I)) for p in PII_PATTERNS)
        score.pii_instances = pii_hits
        if pii_hits > 0:
            score.g7_pii = 0.0
            rejects.append(f"AUTO-REJECT: PII detected ({pii_hits} instances)")
        else:
            score.g7_pii = 4.0

        # G8 Offensive Content (3pts)
        if any(o in tl for o in OFFENSIVE_TERMS):
            score.g8_offensive = 0.0
            rejects.append("AUTO-REJECT: Offensive/harmful content detected")
        else:
            score.g8_offensive = 3.0

        # G9 Metadata Completeness (3pts)
        meta_score = 0
        if metadata.get("source"): meta_score += 1
        if metadata.get("year"):   meta_score += 1
        if metadata.get("doc_type"): meta_score += 1
        score.g9_metadata = float(meta_score)

        score.tier1_total = (score.g1_data_quality + score.g2_duplicate + score.g3_copyright +
                             score.g4_freshness + score.g5_pdf_quality + score.g6_coverage +
                             score.g7_pii + score.g8_offensive + score.g9_metadata)

        # ── TIER 2: EVIDENCE QUALITY ───────────────────────────────────

        # D1 Source Authority (14pts)
        src = (metadata.get("source", "") + " " + title).lower()
        src_hits = sum(1 for s in AUTHORITATIVE_SOURCES if s in src or s in tl)
        score.d1_source_authority = min(14.0, src_hits * 3.0) if src_hits > 0 else 2.0
        if src_hits == 0:
            rejects.append("AUTO-REJECT: No authoritative source identified")

        # D2 Evidence Grade (11pts)
        grade = metadata.get("evidence_grade", "")
        rct_signals = ["randomized controlled", "rct", "double-blind", "placebo-controlled"]
        sr_signals  = ["systematic review", "meta-analysis", "cochrane"]
        cohort_sigs = ["cohort study", "prospective", "retrospective", "registry"]
        if grade == "A" or any(s in tl for s in rct_signals + sr_signals): score.d2_evidence_grade = 11.0
        elif grade == "B" or any(s in tl for s in cohort_sigs): score.d2_evidence_grade = 7.0
        elif grade == "C": score.d2_evidence_grade = 4.0
        else: score.d2_evidence_grade = 2.0

        # D3 Peer Review (8pts)
        peer_signals = ["doi:", "j. clin", "lancet", "n engl j med", "jama", "bmj", "annals", "volume", "issue", "abstract"]
        score.d3_peer_review = 8.0 if any(p in tl for p in peer_signals) else 3.0

        # D4 Recency (7pts)
        year = metadata.get("year")
        if year:
            age = datetime.now().year - int(year)
            score.d4_recency = 7.0 if age <= 1 else 5.0 if age <= 3 else 3.0 if age <= 5 else 1.0
        else:
            score.d4_recency = 2.0

        # D5 LATAM Relevance (6pts)
        latam_hits = sum(1 for t in LATAM_TERMS if t in tl)
        score.d5_latam_relevance = min(6.0, latam_hits * 1.5)

        # D6 Clinical Specificity (5pts)
        clin_hits = sum(1 for t in CLINICAL_TERMS if t in tl)
        score.d6_clinical_spec = min(5.0, clin_hits * 0.3)
        if clin_hits < 3:
            rejects.append("AUTO-REJECT: Insufficient clinical specificity")

        # D7 Sample Size (4pts)
        n_match = re.findall(r'\bn\s*=\s*(\d+)', tl)
        if n_match:
            max_n = max(int(n) for n in n_match)
            score.d7_sample_size = 4.0 if max_n >= 1000 else 3.0 if max_n >= 100 else 2.0 if max_n >= 10 else 1.0
        else:
            score.d7_sample_size = 1.0

        # D8 Completeness (2pts) — structured content
        has_abstract = "abstract" in tl or "background" in tl or "introduction" in tl
        has_conclusion = "conclusion" in tl or "results" in tl or "findings" in tl
        score.d8_completeness = 2.0 if (has_abstract and has_conclusion) else 1.0

        # D9 Conflict of Interest (2pts)
        coi_decl = "conflict of interest" in tl or "disclosure" in tl or "funding" in tl
        coi_concern = "funded by pharmaceutical" in tl or "sponsored by" in tl
        score.d9_coi = 2.0 if coi_decl and not coi_concern else 1.5 if coi_decl else 1.0

        # D10 Citation Impact (1pt) — impact factor proxy
        high_impact = ["new england journal", "lancet", "jama", "nature medicine", "cell", "science"]
        score.d10_citation_impact = 1.0 if any(h in tl for h in high_impact) else 0.5

        score.tier2_total = (score.d1_source_authority + score.d2_evidence_grade + score.d3_peer_review +
                             score.d4_recency + score.d5_latam_relevance + score.d6_clinical_spec +
                             score.d7_sample_size + score.d8_completeness + score.d9_coi +
                             score.d10_citation_impact)

        # ── FINAL SCORE ────────────────────────────────────────────────
        score.total_score  = round(score.tier1_total + score.tier2_total, 2)
        score.reject_reasons = rejects
        score.auto_rejected = bool(rejects)

        if score.auto_rejected:
            score.quality_std = "REJECTED"
        elif score.total_score >= 85:
            score.quality_std = "GOLD"
        elif score.total_score >= 70:
            score.quality_std = "SILVER"
        elif score.total_score >= 55:
            score.quality_std = "BORDERLINE"
        else:
            score.quality_std = "REJECTED"
            score.auto_rejected = True

        return score

    def should_ingest(self, score: PreRAGScore) -> bool:
        return not score.auto_rejected and score.quality_std in ("GOLD", "SILVER", "BORDERLINE")


_gate = None

def get_prerag_gate() -> PRISMPreRAGGate:
    global _gate
    if _gate is None:
        _gate = PRISMPreRAGGate()
    return _gate
