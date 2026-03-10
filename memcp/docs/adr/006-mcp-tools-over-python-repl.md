# ADR-006: MCP Tools over Python REPL

## Status

Accepted

## Date

2026-02-07

## Context

The RLM paper (arXiv:2512.24601) proposes a sandboxed Python REPL as the primary interface for context navigation. The model writes Python code to manipulate content:

```python
# RLM paper pattern
result = context[:1000]           # Peeking
matches = re.findall(pat, ctx)    # Grepping
chunks = split(context, 50)       # Partitioning
answer = llm_query(chunk, q)      # Sub-query
```

Claude Code already has a different paradigm: **MCP tools** — structured function calls with typed parameters, exposed via the Model Context Protocol. Claude calls tools by name with JSON arguments, not by writing Python.

The question: should MemCP expose a Python REPL for content navigation (matching the paper), or expose MCP tools that implement the same strategies?

## Decision

Expose **MCP tools** that implement all RLM navigation strategies. No Python REPL.

| RLM Strategy | Paper (Python REPL) | MemCP (MCP Tool) |
|-------------|-------------------|-----------------|
| Peeking | `context[:1000]` | `memcp_peek_chunk(name, index)` / `memcp_get_context(name, start, end)` |
| Grepping | `re.findall(pattern, ctx)` | `memcp_filter_context(name, pattern)` |
| Partitioning | `chunks = split(ctx, n)` | `memcp_chunk_context(name, strategy, chunk_size)` |
| Sub-query | `llm_query(chunk, question)` | `memcp-mapper` sub-agent |
| Metadata inspection | `len(context)`, `type(context)` | `memcp_inspect_context(name)` |

Each MCP tool has a typed signature, docstring (shown to Claude as tool description), and returns structured JSON. The model never writes raw Python — it calls tools.

## Consequences

### Positive

- **Native to Claude Code**: MCP tools are the standard interface. Claude Code already knows how to discover, select, and call tools. No prompt engineering needed to teach REPL usage.
- **Type safety**: Tool parameters are typed (string, int, bool). Invalid calls are caught before execution, unlike runtime errors in a REPL.
- **Auditable**: Every tool call is logged by Claude Code. A REPL's arbitrary code execution is harder to audit.
- **Secure**: No code injection risk. Tools validate inputs (regex patterns, file names) before execution. A REPL would need sandboxing to prevent filesystem access outside `~/.memcp/`.
- **Discoverable**: Claude sees all available tools with descriptions. In a REPL, the model must discover available functions by reading documentation or source code.
- **Consistent interface**: All tools return JSON strings. REPL output format depends on what code the model writes.

### Negative

- **Less flexible**: A REPL can compose operations in arbitrary ways (e.g., `[c for c in chunks if "error" in c]`). Tools require separate calls: `memcp_chunk_context()` then `memcp_filter_context()`.
- **More tool calls**: Complex navigation may require 3-4 sequential tool calls where a REPL could express the same logic in one code block.
- **Fixed strategies**: The set of navigation strategies is limited to what's exposed as tools. A REPL can invent new strategies on the fly.

### Why This Works

The RLM paper observes that models naturally discover a small set of "emergent strategies" — peeking, grepping, partitioning, map-reduce. These are not arbitrary programs; they're a finite, predictable set of operations. MCP tools can capture this finite set completely. The paper itself notes that the model "learns when to peek, when to grep, when to partition" — the strategies are the same whether expressed as Python or as tool calls.

## Alternatives Considered

### Sandboxed Python REPL

Expose a `memcp_exec(code)` tool that runs Python in a restricted sandbox with access to loaded contexts. Rejected because:
- **Security risk**: Even sandboxed REPLs have escape vectors. MCP tools have no code execution surface.
- **Redundant**: Claude Code already has Bash tool access. Adding another execution environment adds complexity without proportional benefit.
- **Prompt overhead**: Teaching the model to write correct Python for navigation requires prompt tokens. Tool calling is native.
- **Error handling**: REPL errors (syntax, runtime) must be caught and fed back. Tool errors are structured.

### Hybrid (Tools + REPL)

Expose both MCP tools and a REPL for advanced users. Rejected because:
- Two ways to do the same thing creates confusion
- Model must choose between tools and code — wastes context on decision-making
- Testing surface doubles
- The finite set of RLM strategies maps completely to tools; no capability gap
