# ADR-005: Minimal Core Dependencies

## Status

Accepted

## Date

2026-02-07

## Context

MemCP is an MCP server that runs as a subprocess spawned by Claude Code. Every dependency adds:

- **Install time** — Users expect `pip install memcp` to be fast
- **Attack surface** — Each package is a supply-chain risk
- **Compatibility risk** — More deps mean more version conflicts with the user's project
- **Binary compilation** — Some packages (numpy, scipy) require C compilation or large binary wheels
- **Startup latency** — MCP servers start on every Claude Code session; import time matters

At the same time, MemCP offers advanced features (BM25 search, semantic embeddings, fuzzy matching, vector storage, embedding cache) that require substantial third-party libraries.

## Decision

Keep **exactly 2 core dependencies**: `mcp>=1.0.0` and `pydantic>=2.0.0`. Everything else is optional, organized as named extras in `pyproject.toml`:

| Extra | Packages | What It Enables |
|-------|----------|----------------|
| `search` | `bm25s>=0.2.0` | BM25 ranked keyword search |
| `fuzzy` | `rapidfuzz>=3.0` | Typo-tolerant matching |
| `semantic` | `model2vec>=0.4.0`, `numpy>=1.24.0` | Static embedding search (~30MB models) |
| `semantic-hq` | `fastembed>=0.5.0`, `numpy>=1.24.0` | ONNX embedding search (~200MB models) |
| `vectors` | `sqlite-vec>=0.1.0` | SIMD-accelerated vector search in SQLite |
| `cache` | `diskcache>=5.6.0` | Persistent embedding cache |
| `llm` | `httpx>=0.27.0` | HTTP calls to Ollama/external LLMs |
| `dev` | `pytest`, `pytest-asyncio`, `ruff` | Development and testing |
| `all` | All of the above | Everything |

Optional imports use the guard pattern:

```python
try:
    import bm25s
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
```

## Consequences

### Positive

- **Fast install**: `pip install memcp` downloads 2 packages. Sub-second on cached PyPI.
- **Minimal surface**: Only `mcp` and `pydantic` are attack vectors. Both are well-maintained, widely-used libraries.
- **No compilation**: Core install has no C extensions. Works on any platform with Python 3.10+.
- **User choice**: Users install only what they need. A basic user gets keyword search; a power user gets hybrid BM25+semantic.
- **Graceful degradation**: Every feature works at some level without optional deps. Search falls back to keyword, graph uses regex entities, embeddings are skipped.

### Negative

- **Feature discovery**: Users may not know about optional extras unless they read the docs. The installer mitigates this with an interactive extras chooser.
- **Import-time checks**: `*_AVAILABLE` flags are set once at import. Installing a dep mid-session requires a server restart.
- **Testing matrix**: CI must test both "deps installed" and "deps missing" paths. Handled via separate CI jobs (`test-core`, `test-search`, `test-semantic`).

## Alternatives Considered

### Include BM25 + NumPy as Core Dependencies

Make `bm25s` and `numpy` required since search is a core feature. Rejected because:
- `numpy` pulls in ~30MB of binary wheels and sometimes requires compilation
- `bm25s` depends on `scipy` — another large binary package
- Core keyword search (stdlib-only) covers the majority of use cases
- Users who only want `memcp_remember` / `memcp_recall` shouldn't pay the numpy tax

### Use a Single "extras" Group

Bundle all optional deps into one `[extras]` group. Rejected because:
- Users who want BM25 search shouldn't be forced to download embedding models (30-400MB)
- Named extras let users pick exactly what they need: `pip install memcp[search,fuzzy]`
- CI jobs can test specific feature combinations in isolation

### Vendor Dependencies

Copy small libraries (like a BM25 implementation) directly into the source tree. Rejected because:
- Maintenance burden — must track upstream fixes
- License complexity — must comply with each vendored library's license
- Existing libraries (`bm25s`, `rapidfuzz`) are well-optimized; a vendored copy would be inferior
