# Test Resolution Reference

## Smart Error Grouping

When facing multiple test failures, don't fix them one by one.
Group first, then fix systematically.

### Step 1: Run Full Suite

```bash
pytest test/ -v 2>&1 | tee test_output.txt
```

Analyze output for:
- Total number of failures
- Error types and patterns
- Affected modules/files

### Step 2: Group by Error Type

| Priority | Error Type | Typical Cause |
| --- | --- | --- |
| 1 (fix first) | `ImportError` / `ModuleNotFoundError` | Missing dep, renamed module, broken build |
| 2 | `AttributeError` | API change, renamed method/property |
| 3 | `TypeError` | Changed function signature, wrong arg count |
| 4 | `AssertionError` | Logic change, expected value shifted |
| 5 (fix last) | `RuntimeError` / domain errors | Business logic bugs |

### Step 3: Fix Order

**Infrastructure first:**
- Import errors, missing dependencies, config issues
- Build failures (`setup.py build_ext --inplace`)
- Fixture/conftest problems

**Then API changes:**
- Function signature changes
- Module reorganization
- Renamed variables/functions/classes

**Finally logic issues:**
- Assertion failures
- Business logic bugs
- Edge case handling

### Step 4: Verify Each Group

After fixing each group, run a focused subset:

```bash
# Run specific file
pytest test/test_solver_supervision.py -v

# Run by keyword
pytest test/ -k "test_solver" -v

# Run failed tests from last run
pytest test/ --lf -v
```

Only move to the next group after the current one passes.

### Step 5: Final Verification

```bash
# Full suite, stop on first failure for quick feedback
pytest test/ -x -v

# Full suite, all tests
pytest test/ -v
```

## pytest Patterns

### Useful Flags

```bash
pytest test/ -v                 # Verbose output
pytest test/ -x                 # Stop on first failure
pytest test/ --lf               # Rerun last failures only
pytest test/ --tb=short         # Shorter tracebacks
pytest test/ --tb=long          # Full tracebacks
pytest test/ -k "pattern"       # Filter by name pattern
pytest test/ -s                 # Show print() output (no capture)
pytest test/ --durations=10     # Show 10 slowest tests
```

### Test Naming Convention

- `test_*.py` — Active test files (run by default)
- `_test_*.py` — Disabled/manual tests (skipped by pytest discovery)
- `bench_*.py` — Benchmark scripts (not tests)

### Mock Config Pattern

When tests need a config object but the real one is heavy:

```python
from dataclasses import dataclass

@dataclass
class MockConfig:
    """Minimal config for testing — add fields as needed."""
    solver_supervision_enabled: bool = True
    solver_value_loss_weight: float = 0.5
    solver_max_remain_count: int = 8
    # Dynamic attrs that real config sets outside dataclass
    activation: object = None
    norm_type: str = "BN"
    last_linear_layer_init_zero: bool = False
```

### Fixture Patterns

```python
import pytest

@pytest.fixture
def mock_state():
    """Create a reproducible game state for testing."""
    state = create_state(seed=42)
    return state

@pytest.fixture
def mock_config():
    """Minimal config with all required dynamic attrs."""
    config = MockConfig()
    config.activation = nn.GELU(approximate="tanh")
    return config
```

## Debugging Test Failures

### Read the Full Error First

```bash
# Get maximum detail
pytest test/test_file.py::test_name -v --tb=long -s
```

### Check What Changed

```bash
# What files changed that might affect this test?
git diff --name-only HEAD~5 -- '*.py'

# Specifically check test infrastructure
git diff -- test/ conftest.py
```

### Isolate Flaky Tests

```bash
# Run single test repeatedly
for i in $(seq 1 10); do pytest test/test_file.py::test_name -x; done

# If it passes alone but fails in suite → test pollution
# Run with random order: pip install pytest-randomly
pytest test/ -p randomly -v
```
