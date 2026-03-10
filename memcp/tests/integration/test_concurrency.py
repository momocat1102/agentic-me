"""Concurrency stress tests — verify no DB corruption under parallel load.

Uses concurrent.futures.ThreadPoolExecutor to simulate concurrent MCP
tool calls hitting the SQLite-backed memory system.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed

from memcp.core.memory import forget, recall, remember


class TestParallelRemember:
    """100 parallel remember() calls — no DB corruption."""

    def test_100_parallel_remembers(self, isolated_data_dir):
        results = []
        errors = []

        def do_remember(i: int):
            return remember(
                f"Concurrent insight number {i} about topic {i % 10}",
                category="fact",
                importance="medium",
                tags=f"concurrent,batch-{i % 5}",
            )

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(do_remember, i): i for i in range(100)}
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as exc:
                    errors.append((futures[future], exc))

        assert len(errors) == 0, f"Errors during parallel remember: {errors}"

        # All 100 should be stored (some may be deduped if content hashes collide,
        # but with unique content they should all succeed)
        assert len(results) == 100

        # Verify all have valid IDs
        ids = {r["id"] for r in results}
        assert len(ids) == 100  # All unique

        # Verify we can recall them all
        all_insights = recall(scope="all", limit=200)
        assert len(all_insights) == 100


class TestParallelRecall:
    """50 parallel recall() calls — consistent results."""

    def test_50_parallel_recalls(self, isolated_data_dir):
        # Setup: store some insights first
        for i in range(10):
            remember(f"Pre-stored insight {i} about databases", tags="db")

        results = []
        errors = []

        def do_recall(i: int):
            return recall(query="databases", scope="all")

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(do_recall, i): i for i in range(50)}
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as exc:
                    errors.append((futures[future], exc))

        assert len(errors) == 0, f"Errors during parallel recall: {errors}"
        assert len(results) == 50

        # All recall results should be consistent — same count
        counts = {len(r) for r in results}
        assert len(counts) == 1, f"Inconsistent recall counts: {counts}"
        assert counts.pop() == 10


class TestMixedReadWrite:
    """Mixed read/write operations — no deadlock."""

    def test_mixed_read_write_no_deadlock(self, isolated_data_dir):
        # Seed with some initial data
        for i in range(5):
            remember(f"Seed insight {i} for mixed test")

        results = []
        errors = []

        def mixed_op(i: int):
            if i % 3 == 0:
                # Write
                return ("write", remember(f"Mixed write insight {i}"))
            elif i % 3 == 1:
                # Read
                return ("read", recall(scope="all", limit=50))
            else:
                # Query with search term
                return ("query", recall(query="insight", scope="all"))

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(mixed_op, i): i for i in range(60)}
            for future in as_completed(futures, timeout=30):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as exc:
                    errors.append((futures[future], exc))

        assert len(errors) == 0, f"Errors during mixed ops: {errors}"
        assert len(results) == 60

        # Count operations
        writes = [r for r in results if r[0] == "write"]
        reads = [r for r in results if r[0] in ("read", "query")]
        assert len(writes) == 20  # i % 3 == 0 for 0..59 → 20 writes
        assert len(reads) == 40


class TestConcurrentForget:
    """5 concurrent forget() on same ID — exactly one returns True."""

    def test_concurrent_forget_same_id(self, isolated_data_dir):
        result = remember("Insight to be concurrently forgotten")
        insight_id = result["id"]

        results = []
        errors = []

        def do_forget(_i: int):
            return forget(insight_id)

        with ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(do_forget, i): i for i in range(5)}
            for future in as_completed(futures, timeout=30):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as exc:
                    errors.append((futures[future], exc))

        assert len(errors) == 0, f"Errors during concurrent forget: {errors}"
        assert len(results) == 5

        # Exactly one should return True (the one that actually deleted it)
        true_count = sum(1 for r in results if r is True)
        false_count = sum(1 for r in results if r is False)
        assert true_count == 1, f"Expected 1 True, got {true_count}"
        assert false_count == 4

        # Verify it's actually gone
        all_insights = recall(scope="all", limit=100)
        ids = [i["id"] for i in all_insights]
        assert insight_id not in ids
