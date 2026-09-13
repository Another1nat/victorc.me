import os
import re
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class DocumentChunk:
    chunk_id: str
    doc_title: str
    content: str
    line_start: int
    line_end: int

@dataclass
class RetrievalMatch:
    chunk: DocumentChunk
    sparse_score: float
    dense_score: float
    rrf_score: float

@dataclass
class GroundedAnswer:
    question: str
    answer_text: str
    cited_chunks: List[str]
    citations_verified: bool
    confidence_score: float
    top_matches: List[RetrievalMatch]

class HybridRAGEngine:
    """
    Project 6: RAG Pipeline with Hybrid Search Over Internal Docs.
    Combines sparse keyword frequency (BM25-style) with semantic dense scoring,
    fused via Reciprocal Rank Fusion (RRF), and generates grounded answers with verifiable citations.
    """
    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self._load_sample_internal_docs()

    def _load_sample_internal_docs(self):
        # Sample production system documentation
        sample_docs = [
            DocumentChunk(
                chunk_id="doc-arch-01",
                doc_title="KV-Cache Optimization Protocol",
                content="KV-Cache memory scales linearly with sequence length O(s) and context windows. In multi-tenant inference, PagedAttention partitions KV blocks across GPU VRAM to prevent allocation fragmentation.",
                line_start=14,
                line_end=22,
            ),
            DocumentChunk(
                chunk_id="doc-sec-02",
                doc_title="API Gateway Rate Limiting Specification",
                content="The token bucket limiter evaluates requests against team budgets. When token consumption exceeds 40,000 TPM or spend reaches max_budget_usd, HTTP 429 Too Many Requests is returned with standard retry-after headers.",
                line_start=45,
                line_end=58,
            ),
            DocumentChunk(
                chunk_id="doc-fail-03",
                doc_title="Circuit Breaker High Availability Policy",
                content="A circuit breaker trips to OPEN state after 3 consecutive 5xx or timeout errors. In OPEN state, incoming traffic bypasses the primary provider and executes automatic failover to the secondary provider.",
                line_start=80,
                line_end=94,
            ),
        ]
        self.chunks.extend(sample_docs)

    def ingest_markdown_file(self, file_path: str, doc_title: Optional[str] = None) -> int:
        """
        Real ingestion path (Project 6's "ingests a company's internal documentation"):
        reads an actual markdown file off disk and splits it into chunks on `##`/`###`
        headings, recording the file's genuine line numbers for each chunk so citations
        point at real, checkable source lines — not the hand-picked line ranges used by
        the curated sample docs above. Returns the number of chunks added.
        """
        if not os.path.isfile(file_path):
            return 0

        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        title = doc_title or os.path.basename(file_path)
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

        sections: List[Tuple[int, int, str]] = []  # (line_start, line_end, content)
        current_start = 0
        current_lines: List[str] = []

        def flush(end_idx: int):
            content = "".join(current_lines).strip()
            if content:
                sections.append((current_start + 1, end_idx, content))

        for i, line in enumerate(lines):
            if re.match(r"^#{2,3}\s+\S", line):
                flush(i)
                current_start = i
                current_lines = [line]
            else:
                current_lines.append(line)
        flush(len(lines))

        added = 0
        for idx, (start, end, content) in enumerate(sections):
            if len(content) < 40:  # skip near-empty sections
                continue
            self.chunks.append(
                DocumentChunk(
                    chunk_id=f"doc-{slug}-{idx:02d}",
                    doc_title=title,
                    content=content[:1200],
                    line_start=start,
                    line_end=end,
                )
            )
            added += 1
        return added

    def _compute_sparse_score(self, query: str, text: str) -> float:
        """Normalized term-frequency keyword matching."""
        q_terms = set(re.findall(r"\w+", query.lower()))
        if not q_terms:
            return 0.0
        doc_terms = re.findall(r"\w+", text.lower())
        match_count = sum(1 for term in doc_terms if term in q_terms)
        return match_count / max(len(doc_terms), 1)

    def _compute_dense_score(self, query: str, text: str) -> float:
        """Character-trigram and semantic cosine overlap simulation."""
        def get_trigrams(s):
            s = s.lower()
            return set(s[i:i+3] for i in range(len(s)-2))
        
        q_tri = get_trigrams(query)
        doc_tri = get_trigrams(text)
        if not q_tri or not doc_tri:
            return 0.0
        intersection = q_tri.intersection(doc_tri)
        return len(intersection) / math.sqrt(len(q_tri) * len(doc_tri))

    def hybrid_search(self, query: str, top_k: int = 2) -> List[RetrievalMatch]:
        sparse_scores = [self._compute_sparse_score(query, c.content) for c in self.chunks]
        dense_scores = [self._compute_dense_score(query, c.content) for c in self.chunks]

        # Rank indices
        sparse_ranked = sorted(range(len(self.chunks)), key=lambda i: sparse_scores[i], reverse=True)
        dense_ranked = sorted(range(len(self.chunks)), key=lambda i: dense_scores[i], reverse=True)

        # Reciprocal Rank Fusion: RRF = 1 / (60 + rank_sparse) + 1 / (60 + rank_dense)
        rrf_scores = {}
        for r, idx in enumerate(sparse_ranked):
            rrf_scores[idx] = rrf_scores.get(idx, 0.0) + (1.0 / (60.0 + r + 1))
        for r, idx in enumerate(dense_ranked):
            rrf_scores[idx] = rrf_scores.get(idx, 0.0) + (1.0 / (60.0 + r + 1))

        # Sort by final RRF score
        sorted_indices = sorted(rrf_scores.keys(), key=lambda i: rrf_scores[i], reverse=True)[:top_k]

        matches = []
        for idx in sorted_indices:
            matches.append(
                RetrievalMatch(
                    chunk=self.chunks[idx],
                    sparse_score=round(sparse_scores[idx], 4),
                    dense_score=round(dense_scores[idx], 4),
                    rrf_score=round(rrf_scores[idx], 5),
                )
            )
        return matches

    def generate_grounded_answer(self, query: str) -> GroundedAnswer:
        matches = self.hybrid_search(query, top_k=2)
        if not matches:
            return GroundedAnswer(
                question=query,
                answer_text="No relevant documentation found.",
                cited_chunks=[],
                citations_verified=False,
                confidence_score=0.0,
                top_matches=[],
            )

        top_match = matches[0]
        chunk = top_match.chunk

        # Synthesize answer with verifiable source citation
        answer_text = f"According to [{chunk.chunk_id}:L{chunk.line_start}-L{chunk.line_end}], {chunk.content}"

        # Verify citation grounding against the actual retrieval signal, not a
        # tautology. `chunk.chunk_id in answer_text` was always true — the
        # citation is built FROM the chunk it's citing on the line above, so
        # that check could never fail, and every query (including irrelevant,
        # near-zero-overlap ones) was reported as a 0.96-confidence verified
        # match. Grounding now requires the retrieval itself to have found a
        # real signal: some literal keyword overlap (sparse) or a lexical
        # resemblance clearly above chance (dense).
        match_strength = top_match.sparse_score + top_match.dense_score
        is_grounded = top_match.sparse_score > 0.0 or top_match.dense_score >= 0.15
        confidence = round(min(0.98, 0.5 + match_strength), 3) if is_grounded else round(min(0.45, 0.20 + match_strength), 3)

        return GroundedAnswer(
            question=query,
            answer_text=answer_text,
            cited_chunks=[chunk.chunk_id],
            citations_verified=is_grounded,
            confidence_score=confidence,
            top_matches=matches,
        )
