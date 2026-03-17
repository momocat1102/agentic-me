# C++ / pybind11 / Cython Debugging Reference

## Build Debugging

### Common Build Errors

**Missing Python.h:**
```bash
# Install python dev headers
sudo apt install python3.12-dev  # Match your Python version
```

**C++ standard flag:**
```python
# setup.py must explicitly set C++20 (pybind11 3.x won't add it)
extra_compile_args = ['-std=c++20', '-O3', '-DNDEBUG']
```

**Header dependency tracking:**
```python
# In setup.py, list all headers so rebuilds trigger correctly
ext = Extension(
    'hmb_sim_cpp',
    sources=['bindings.cpp'],
    depends=['solver.hpp', 'game_state.hpp', 'endgame_db.hpp'],  # Track headers
)
```

**Rebuild from scratch:**
```bash
cd C_simulation
rm -rf build/ *.so *.egg-info
python setup.py build_ext --inplace
```

### Platform-Specific Issues

```python
# setup.py platform detection
import platform
if platform.system() == 'Windows':
    extra_compile_args = ['/std:c++20', '/O2', '/EHsc', '/DNDEBUG']
else:
    extra_compile_args = ['-std=c++20', '-O3', '-DNDEBUG']
```

## Runtime Debugging

### Segfaults from Native Extensions

```bash
# GDB debugging
gdb -ex run --args python -c "import hmb_sim_cpp; hmb_sim_cpp.crash_function()"
# In gdb: bt (backtrace), frame N (select frame), info locals

# AddressSanitizer (rebuild with ASAN)
# Add to extra_compile_args: '-fsanitize=address', '-fno-omit-frame-pointer'
# Add to extra_link_args: '-fsanitize=address'
ASAN_OPTIONS=detect_leaks=0 python your_script.py
```

### Print Debugging from C++

```cpp
// In C++ code compiled with pybind11
#include <pybind11/pybind11.h>
namespace py = pybind11;

void debug_function() {
    py::print("DEBUG: entering function");
    // Or use fprintf for lower-level:
    fprintf(stderr, "DEBUG: value = %d\n", some_value);
    fflush(stderr);
}
```

### Verify Module Loading

```python
import hmb_sim_cpp
print(f"Module file: {hmb_sim_cpp.__file__}")
print(f"Available: {[x for x in dir(hmb_sim_cpp) if not x.startswith('_')]}")
```

## Debug API Pattern

Expose internal state through `debug_*` functions:

```cpp
// C++ side: expose debug functions via pybind11
m.def("debug_alpha_beta_solve_with_stats",
      &debug_alpha_beta_solve_with_stats,
      "Solver with full statistics output",
      py::arg("state"), py::arg("root_player"), py::arg("max_depth"));

m.def("debug_endgame_fill_remain_masks",
      &debug_endgame_fill_remain_masks,
      "Inspect endgame DB mask filling");
```

```python
# Python side: call debug APIs for inspection
result = hmb_sim_cpp.debug_alpha_beta_solve_with_stats(state, root_player, max_depth)
print(f"Value: {result.value}, Nodes: {result.nodes_searched}")
```

## Environment Variable Toggles

Control algorithm behavior without recompiling:

```python
import os
# Disable specific optimizations for debugging
os.environ["HMB_AB_NO_CUTOFF"] = "1"      # Pure minimax (no alpha-beta)
os.environ["HMB_AB_NO_EARLY_BREAK"] = "1"  # No terminal-cut
os.environ["HMB_AB_PRUNE_RANKS"] = "0"     # No rank pruning
os.environ["HMB_AB_MOVE_ORDER"] = "0"      # No move ordering

# MUST set BEFORE importing the module
import hmb_sim_cpp
```

## Layered Test Config Pattern

Test algorithm correctness by progressively enabling features:

| Config | What's Enabled | Purpose |
| --- | --- | --- |
| A | Nothing (pure minimax) | Baseline correctness |
| B | Alpha-beta + TT | Pruning correctness |
| C | + Terminal cut | Early termination correctness |
| D | + Rank pruning | Pruning heuristic correctness |
| E | All optimizations | Full solver correctness |

```bash
# Run each layer and compare results
python C_simulation/tests/test_a_pure_minmax.py --seed 42
python C_simulation/tests/test_e_full.py --seed 42
python C_simulation/tests/compare_solver_results.py --all
# All configs must produce identical game values
```

## Cython Extension Debugging

```bash
# Build Cython extension
cd games/honeymoonbridge/make_tree_s
python setup.py build_ext --inplace

# IMPORTANT: copy .so to parent directory
cp *.so ../

# Verify
python -c "from games.honeymoonbridge.solve_recursive_wrapper import solve"
```
