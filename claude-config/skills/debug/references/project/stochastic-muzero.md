# StochasticMuZero Project Debugging Reference

## Known Issues & Gotchas

### C++ Extension Build

- `setup.py` needs explicit `-std=c++20` in `extra_compile_args` (pybind11 3.x won't add it)
- Requires `python3.12-dev` on WSL2 for `Python.h`
- After building, verify: `python -c "from C_simulation import hmb_sim_cpp; print('OK')"`

### Cython Extension (make_tree)

- Build: `cd games/honeymoonbridge/make_tree_s && python setup.py build_ext --inplace`
- **Must copy** `.so` to parent dir: `cp *.so ../`
- Verify: `python -c "from games.honeymoonbridge.solve_recursive_wrapper import solve; print('OK')"`

### Config Dynamic Attributes

`StochasticMuZeroConfig` dataclass does NOT include these — they're set dynamically in experiment configs:

```python
config.activation = nn.GELU(approximate="tanh")
config.norm_type = "BN"
config.last_linear_layer_init_zero = False
```

If a test config is missing these, the network will crash with `AttributeError`.

### Environment API

- `env.legal_actions` is a `@property`, NOT a method — don't call it as `env.legal_actions()`
- `env.reward(player)` requires player argument (0 or 1)
- Must call `env.reset()` before any use
- `net.predictions()` returns `NetworkOutput(value, probabilities, reward, hidden_state)`

### Solver Value Sign Convention

This was a critical bug found during audit:

- `debug_alpha_beta_solve_with_stats(state, root_player, max_depth)` returns value from **root_player's perspective**
- p1 trajectory: `sv = raw_sv if to_play == 0 else -raw_sv`
- p2 trajectory: `sv = raw_sv if to_play == 1 else -raw_sv`
- Getting the sign wrong produces anti-correlated solver labels — training diverges

### Solver Timeout

- Solver can time out on complex positions
- Check `solver_timed_out` flag in result
- Timed-out results must be **SKIPPED**, not used as labels
- If many timeouts: reduce `solver_max_depth` or `solver_max_remain_count`

### Observation Shape Mismatch

- `config.observation_shape` must match actual `env.observation` vector length
- Symptom: `RuntimeError` in network's first linear layer
- Debug: `print(f"obs={env.observation.shape}, config={config.observation_shape}")`

## Debug APIs

### hmb_sim_cpp Debug Functions

```python
from C_simulation import hmb_sim_cpp

# Full solver with statistics
result = hmb_sim_cpp.debug_alpha_beta_solve_with_stats(state, root_player, max_depth)
# Returns: value, nodes_searched, solver_timed_out, etc.

# Inspect endgame DB mask filling
hmb_sim_cpp.debug_endgame_fill_remain_masks(p1_hand, p2_hand, remain_mask, remain_count, trump)

# Endgame DB value lookup
value = hmb_sim_cpp.debug_endgame_db_value_from_state(state, root_player, endgame_fill_remain)
```

### Environment Variable Toggles

Set BEFORE importing `hmb_sim_cpp`:

| Variable | Effect |
| --- | --- |
| `HMB_AB_NO_CUTOFF=1` | Disable alpha-beta (pure minimax) |
| `HMB_AB_NO_EARLY_BREAK=1` | Disable terminal-cut optimization |
| `HMB_AB_PRUNE_RANKS=0` | Disable rank pruning |
| `HMB_AB_MOVE_ORDER=0` | Disable move ordering |

## Solver Test Layers

| Config | File | What's Enabled |
| --- | --- | --- |
| A | `test_a_pure_minmax.py` | Nothing (pure minimax baseline) |
| B | `test_b_ab_tt.py` | Alpha-beta + transposition table |
| C | `test_c_terminal_cut.py` | + Terminal cut optimization |
| D | `test_d_rank_prune.py` | + Rank pruning |
| E | `test_e_full.py` | All optimizations |

```bash
# Run specific layer
python C_simulation/tests/test_e_full.py --seed 42

# Compare all layers (values must match)
python C_simulation/tests/compare_solver_results.py --all
```

## Build & Test Commands

### Build Extensions

```bash
# C++ pybind11 module
cd C_simulation && python setup.py build_ext --inplace && cd ..

# Cython bridge solver
cd games/honeymoonbridge/make_tree_s && python setup.py build_ext --inplace && cp *.so .. && cd ../../..
```

### Run Tests

```bash
# All unit tests
pytest test/ -v

# Specific test file
pytest test/test_solver_supervision.py -v

# Specific test by name
pytest test/ -k "test_solver_label" -v

# Solver correctness tests
python C_simulation/tests/test_e_full.py --seed 42
```

### Training Smoke Test

Use a minimal config to verify the full pipeline:

```python
# Small config for quick verification
config.hidden_layer_size = 64
config.num_layers = 1
config.training_steps = 30
config.n_episode = 2
config.other_config = {'endgame_db_root': '/mnt/d/workspace/EDB/DB'}
# Disable eval and reanalyze for speed
```

## TensorBoard Metrics

Key metrics to monitor during training:

- `Train/total_loss` — should decrease steadily
- `Train/value_loss`, `Train/policy_loss` — component losses
- `Train/grad_norm` — should stay finite, ideally < 5
- `Train/solver_value_loss` — solver supervision auxiliary loss
- `Train/solver_value_mae` — mean absolute error vs solver labels
- `collect/solver_query_rate` — fraction of states labeled by solver

## Discovered Patterns

<!-- Append new debugging discoveries below this line -->

### Pattern: Ray Object Store Pressure
- **Symptom**: `ObjectLostError` during self-play
- **Check**: Replay buffer size, number of workers, trajectory size
- **Fix**: Reduce concurrent workers or increase Object Store memory

### Pattern: NaN in Training Loss
- **Symptom**: Loss becomes NaN, training diverges
- **Check**: Learning rate, gradient clipping threshold, solver value labels (sign correctness!)
- **Debug**: Add `torch.autograd.detect_anomaly()` temporarily
- **Common cause**: Solver label sign convention wrong (see Known Issues above)

### Pattern: Endgame DB Path
- **Symptom**: Solver returns incorrect values or crashes
- **Check**: `other_config['endgame_db_root']` path exists and contains DB files
- **WSL2 path**: `/mnt/d/workspace/EDB/DB`
- **Windows path**: `D:/workspace/EDB/DB`
