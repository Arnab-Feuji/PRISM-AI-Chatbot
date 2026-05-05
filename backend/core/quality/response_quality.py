"""PRISM — RAGAS & Response Quality Scoring"""
import re
from typing import List, Dict
from dataclasses import dataclass


@dataclass
class RAGASResult:
    faithfulness:       float
    answer_relevancy:   float
    context_recall:     float
    context_precision:  float
    answer_similarity:  float
    overall:            float

    def to_dict(self) -> Dict:
        return {
            "faithfulness":       round(self.faithfulness, 4),
            "answer_relevancy":   round(self.answer_relevancy, 4),
            "context_recall":     round(self.context_recall, 4),
            "context_precision":  round(self.context_precision, 4),
            "answer_similarity":  round(self.answer_similarity, 4),
            "overall":            round(self.overall, 4),
        }


class ResponseQualityScorer:
    """
    Heuristic RAGAS approximation (no LLM cost per message).
    Replace score_heuristic() calls with ragas.evaluate() in production
    when ground-truth datasets are available.
    """

    def score_heuristic(self, query: str, response: str, chunks: List[Dict]) -> Dict:
        q_words = set(re.findall(r'\w+', query.lower()))
        r_words = set(re.findall(r'\w+', response.lower()))
        chunk_texts = " ".join(c.get("text", "") for c in chunks)
        c_words = set(re.findall(r'\w+', chunk_texts.lower()))

        # Faithfulness: response words grounded in context
        faith = len(r_words & c_words) / max(len(r_words), 1) if c_words else 0.5

        # Answer relevancy: query coverage in response
        rel = len(q_words & r_words) / max(len(q_words), 1)

        # Context recall: context covers query intent
        recall = len(q_words & c_words) / max(len(q_words), 1) if c_words else 0.4

        # Context precision: how much context is used
        precision = min(len(chunks) / 5.0, 1.0) * 0.8 + 0.2 if chunks else 0.3

        # Answer similarity: length + coherence heuristic
        words = len(response.split())
        sim = min(words / 150, 1.0) * 0.6 + min(len(set(response.split())) / 80, 1.0) * 0.4

        overall = (faith * 0.25 + rel * 0.25 + recall * 0.20 + precision * 0.15 + sim * 0.15)

        return RAGASResult(
            faithfulness=faith, answer_relevancy=rel,
            context_recall=recall, context_precision=precision,
            answer_similarity=sim, overall=overall,
        ).to_dict()

    def score_evidence_grade(self, response: str) -> str:
        """Detect evidence grade from response text."""
        tl = response.lower()
        if any(t in tl for t in ["grade a","rct","randomised","meta-analysis","systematic review"]): return "A"
        if any(t in tl for t in ["grade b","cohort","prospective","registry"]): return "B"
        if any(t in tl for t in ["grade c","consensus","expert opinion","case series"]): return "C"
        return "NR"

    def score_coherence(self, response: str) -> float:
        """Simple coherence: sentence length variance + structure."""
        sentences = re.split(r'[.!?]+', response)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        if not sentences: return 0.5
        lengths = [len(s.split()) for s in sentences]
        avg = sum(lengths) / len(lengths)
        var = sum((l - avg) ** 2 for l in lengths) / len(lengths)
        # Lower variance = more coherent
        coherence = 1.0 - min(var / 200, 0.8)
        return round(coherence, 3)
