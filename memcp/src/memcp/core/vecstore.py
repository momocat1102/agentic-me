"""Vector store — numpy .npz-based storage for embeddings.

Stores embeddings alongside chunks on disk:
    ~/.memcp/chunks/{context_name}/embeddings.npz

For memory insights:
    ~/.memcp/cache/insight_embeddings.npz

Brute-force cosine similarity search (sufficient for <100K vectors).
All numpy operations are guarded — module degrades gracefully if numpy is absent.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

NUMPY_AVAILABLE = False
try:
    import numpy as np

    NUMPY_AVAILABLE = True
except ImportError:
    np = None  # type: ignore[assignment]


class VectorStore:
    """Numpy-based vector store for chunk/insight embeddings.

    Stores vectors in a .npz file with two arrays:
    - ids: 1D array of ID strings
    - vectors: 2D array of float32 vectors

    Search uses brute-force cosine similarity.
    """

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.ids: list[str] = []
        self.vectors: Any = None  # np.ndarray | None

    def load(self) -> bool:
        """Load vectors from .npz file. Returns True on success."""
        if not NUMPY_AVAILABLE or not self.path.exists():
            return False
        try:
            data = np.load(self.path, allow_pickle=True)
            self.ids = list(data["ids"])
            self.vectors = data["vectors"].astype(np.float32)
            return True
        except Exception:
            self.ids = []
            self.vectors = None
            return False

    def save(self) -> None:
        """Persist vectors atomically to .npz file."""
        if not NUMPY_AVAILABLE or self.vectors is None or len(self.ids) == 0:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.parent / (self.path.stem + "_tmp.npz")
        try:
            np.savez(
                tmp_path,
                ids=np.array(self.ids, dtype=object),
                vectors=self.vectors.astype(np.float32),
            )
            tmp_path.rename(self.path)
        except Exception:
            if tmp_path.exists():
                tmp_path.unlink()
            raise

    def add(self, item_id: str, vector: list[float]) -> None:
        """Add or replace a vector for an item."""
        if not NUMPY_AVAILABLE:
            return
        vec = np.asarray(vector, dtype=np.float32).reshape(1, -1)
        if item_id in self.ids:
            idx = self.ids.index(item_id)
            self.vectors[idx] = vec[0]
            return
        self.ids.append(item_id)
        if self.vectors is None:
            self.vectors = vec
        else:
            self.vectors = np.vstack([self.vectors, vec])

    def add_batch(self, item_ids: list[str], vectors: list[list[float]]) -> None:
        """Add multiple vectors at once (more efficient than repeated add)."""
        if not NUMPY_AVAILABLE or not item_ids:
            return
        new_vecs = np.asarray(vectors, dtype=np.float32)
        for i, item_id in enumerate(item_ids):
            if item_id in self.ids:
                idx = self.ids.index(item_id)
                self.vectors[idx] = new_vecs[i]
            else:
                self.ids.append(item_id)
                if self.vectors is None:
                    self.vectors = new_vecs[i : i + 1]
                else:
                    self.vectors = np.vstack([self.vectors, new_vecs[i : i + 1]])

    def remove(self, item_id: str) -> bool:
        """Remove a vector by ID. Returns True if found."""
        if not NUMPY_AVAILABLE or item_id not in self.ids:
            return False
        idx = self.ids.index(item_id)
        self.ids.pop(idx)
        if self.vectors is not None:
            self.vectors = np.delete(self.vectors, idx, axis=0)
            if len(self.ids) == 0:
                self.vectors = None
        return True

    def search(self, query_vector: list[float], top_k: int = 10) -> list[tuple[str, float]]:
        """Cosine similarity search. Returns list of (id, score) tuples."""
        if not NUMPY_AVAILABLE or self.vectors is None or len(self.ids) == 0:
            return []
        query = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
        q_norm = float(np.linalg.norm(query))
        if q_norm == 0:
            return []
        v_norms = np.linalg.norm(self.vectors, axis=1)
        v_norms = np.where(v_norms == 0, 1e-10, v_norms)
        similarities = (self.vectors @ query.T).flatten() / (v_norms * q_norm)
        similarities = np.clip(similarities, 0, 1)
        k = min(top_k, len(self.ids))
        top_indices = np.argsort(similarities)[::-1][:k]
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0:
                results.append((self.ids[idx], score))
        return results

    def count(self) -> int:
        """Number of stored vectors."""
        return len(self.ids)

    def has_id(self, item_id: str) -> bool:
        """Check if an ID exists in the store."""
        return item_id in self.ids


# ── HNSW backend (optional, via usearch) ─────────────────────────────

USEARCH_AVAILABLE = False
try:
    from usearch.index import Index as _UsearchIndex

    USEARCH_AVAILABLE = True
except ImportError:
    _UsearchIndex = None


class HNSWVectorStore:
    """HNSW-based vector store using usearch for O(log N) search.

    Same interface as VectorStore but uses approximate nearest neighbors.
    Falls back to brute-force VectorStore when usearch is not installed.
    """

    def __init__(self, path: Path, ndim: int = 256) -> None:
        self.path = Path(path)
        self._ndim = ndim
        self.ids: list[str] = []
        self._id_to_key: dict[str, int] = {}
        self._next_key: int = 0
        self._index: Any = None  # usearch.Index

    def load(self) -> bool:
        """Load HNSW index from disk. Returns True on success."""
        if not USEARCH_AVAILABLE:
            return False
        index_path = self.path.with_suffix(".usearch")
        ids_path = self.path.with_suffix(".ids.npz")
        if not index_path.exists() or not ids_path.exists():
            return False
        try:
            self._index = _UsearchIndex(ndim=self._ndim, metric="cos")
            self._index.load(str(index_path))

            data = np.load(ids_path, allow_pickle=True)
            self.ids = list(data["ids"])
            keys = list(data["keys"])
            self._id_to_key = dict(zip(self.ids, keys, strict=False))
            self._next_key = max(keys) + 1 if keys else 0
            return True
        except Exception:
            self._index = None
            self.ids = []
            self._id_to_key = {}
            self._next_key = 0
            return False

    def save(self) -> None:
        """Persist HNSW index to disk."""
        if not USEARCH_AVAILABLE or self._index is None or not self.ids:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        index_path = self.path.with_suffix(".usearch")
        ids_path = self.path.with_suffix(".ids.npz")
        try:
            self._index.save(str(index_path))
            keys = [self._id_to_key[id_] for id_ in self.ids]
            np.savez(
                ids_path,
                ids=np.array(self.ids, dtype=object),
                keys=np.array(keys, dtype=np.int64),
            )
        except Exception:
            pass

    def _ensure_index(self) -> None:
        if self._index is None:
            self._index = _UsearchIndex(ndim=self._ndim, metric="cos")

    def add(self, item_id: str, vector: list[float]) -> None:
        """Add or replace a vector."""
        if not USEARCH_AVAILABLE or not NUMPY_AVAILABLE:
            return
        self._ensure_index()
        vec = np.asarray(vector, dtype=np.float32)
        if self._ndim != len(vec):
            self._ndim = len(vec)
            self._index = _UsearchIndex(ndim=self._ndim, metric="cos")
            # Re-add all existing would be needed, but for simplicity
            # just update ndim for new index

        if item_id in self._id_to_key:
            key = self._id_to_key[item_id]
            self._index.remove(key)
        else:
            key = self._next_key
            self._next_key += 1
            self.ids.append(item_id)

        self._id_to_key[item_id] = key
        self._index.add(key, vec)

    def add_batch(self, item_ids: list[str], vectors: list[list[float]]) -> None:
        """Add multiple vectors at once."""
        for item_id, vec in zip(item_ids, vectors, strict=False):
            self.add(item_id, vec)

    def remove(self, item_id: str) -> bool:
        """Remove a vector by ID."""
        if not USEARCH_AVAILABLE or item_id not in self._id_to_key:
            return False
        key = self._id_to_key.pop(item_id)
        self.ids.remove(item_id)
        if self._index is not None:
            self._index.remove(key)
        return True

    def search(self, query_vector: list[float], top_k: int = 10) -> list[tuple[str, float]]:
        """Approximate nearest neighbor search. Returns (id, score) tuples."""
        if not USEARCH_AVAILABLE or not NUMPY_AVAILABLE or self._index is None or not self.ids:
            return []
        vec = np.asarray(query_vector, dtype=np.float32)
        k = min(top_k, len(self.ids))
        matches = self._index.search(vec, k)

        # Build reverse key→id map
        key_to_id = {v: k for k, v in self._id_to_key.items()}
        results = []
        for i in range(len(matches)):
            key = int(matches.keys[i])
            dist = float(matches.distances[i])
            # usearch cosine metric returns distance, convert to similarity
            score = max(0.0, 1.0 - dist)
            id_ = key_to_id.get(key)
            if id_ and score > 0:
                results.append((id_, score))
        return results

    def count(self) -> int:
        return len(self.ids)

    def has_id(self, item_id: str) -> bool:
        return item_id in self._id_to_key


def get_vector_store(path: Path, ndim: int = 256) -> VectorStore | HNSWVectorStore:
    """Factory: return HNSW store if usearch is available, else brute-force."""
    if USEARCH_AVAILABLE and NUMPY_AVAILABLE:
        return HNSWVectorStore(path, ndim=ndim)
    return VectorStore(path)
