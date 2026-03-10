"""Async utilities — unblock the event loop during heavy I/O.

Wraps synchronous operations with asyncio.to_thread() via a bounded
thread pool. This prevents blocking the event loop when multiple MCP
tool calls are handled concurrently.

Full aiosqlite rewrite is Phase 3; for now, thread offloading is sufficient.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any, TypeVar

T = TypeVar("T")

_executor = ThreadPoolExecutor(max_workers=4)


async def run_sync(func: Callable[..., T], *args: Any) -> T:
    """Run a synchronous function in the thread pool without blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, func, *args)
