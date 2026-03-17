# Python & PyTorch Debugging Reference

## Python Debugging Tools

### Interactive Debuggers

```python
# Python 3.7+ built-in breakpoint
def problematic_function(data):
    breakpoint()  # Drops into pdb; set PYTHONBREAKPOINT=0 to disable
    result = process(data)
    return result

# Post-mortem debugging (after exception)
try:
    risky_operation()
except Exception:
    import pdb; pdb.post_mortem()  # Inspect state at crash point
```

**Key pdb commands:** `n` (next), `s` (step into), `c` (continue), `p expr` (print), `l` (list code), `w` (where/stack), `u/d` (up/down stack)

### Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(name)s %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

logger.debug("Variable state: %s", vars(obj))   # Noisy details
logger.info("Processing batch %d", batch_idx)    # Normal flow
logger.warning("Unusual value: %f", value)       # Unexpected but not fatal
logger.error("Failed to load: %s", path)         # Errors
```

### Profiling

```python
# cProfile — function-level profiling
import cProfile
cProfile.run('train_step(batch)', sort='cumulative')

# line_profiler — line-by-line (pip install line_profiler)
# Decorate with @profile, run with: kernprof -l -v script.py

# Memory profiling (pip install memory_profiler)
from memory_profiler import profile
@profile
def memory_heavy_function():
    big_list = [i for i in range(10**7)]
    return sum(big_list)
```

## PyTorch-Specific Debugging

### Gradient Issues

```python
# Detect anomalies (NaN/Inf in gradients)
with torch.autograd.detect_anomaly():
    output = model(input)
    loss = criterion(output, target)
    loss.backward()  # Will raise if NaN/Inf detected

# Inspect gradients with hooks
def grad_hook(name):
    def hook(grad):
        if torch.isnan(grad).any():
            print(f"NaN gradient in {name}! shape={grad.shape}")
        if torch.isinf(grad).any():
            print(f"Inf gradient in {name}!")
        print(f"{name}: grad norm={grad.norm():.4f}")
    return hook

for name, param in model.named_parameters():
    if param.requires_grad:
        param.register_hook(grad_hook(name))

# Check gradient norm after clipping
grad_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
if not torch.isfinite(grad_norm):
    print(f"WARNING: Non-finite gradient norm: {grad_norm}")
```

### NaN / Inf Detection

```python
def check_tensor(name, t):
    if torch.isnan(t).any():
        print(f"NaN in {name}! shape={t.shape}, count={torch.isnan(t).sum()}")
    if torch.isinf(t).any():
        print(f"Inf in {name}!")

# Common NaN sources:
# - Division by zero → add eps: x / (y + 1e-8)
# - log(0) or log(negative) → use log(x + eps) or clamp
# - Exploding gradients → check lr, gradient clipping
# - Incorrect loss function → sign convention, value range
```

### Tensor Shape Debugging

```python
# Print shapes at module boundaries
torch.set_printoptions(precision=4, linewidth=120, edgeitems=10, threshold=None)

# Quick shape tracer
class ShapeTracer(nn.Module):
    def __init__(self, module, name=""):
        super().__init__()
        self.module = module
        self.name = name
    def forward(self, x):
        print(f"{self.name} input: {x.shape}")
        out = self.module(x)
        print(f"{self.name} output: {out.shape}")
        return out
```

### CUDA Debugging

```bash
# Better stack traces for CUDA errors
CUDA_LAUNCH_BLOCKING=1 python train.py
```

```python
# Device mismatch detection
def check_devices(*tensors, names=None):
    devices = [t.device for t in tensors]
    if len(set(str(d) for d in devices)) > 1:
        for i, (t, d) in enumerate(zip(tensors, devices)):
            name = names[i] if names else f"tensor_{i}"
            print(f"  {name}: device={d}, shape={t.shape}")
        raise RuntimeError("Device mismatch!")

# Memory tracking
torch.cuda.reset_peak_memory_stats()
# ... run code ...
print(f"Peak GPU memory: {torch.cuda.max_memory_allocated() / 1e9:.2f} GB")
print(torch.cuda.memory_summary())
```

### Loss Debugging

```python
# Track loss components separately via TensorBoard
writer = SummaryWriter(log_dir)
writer.add_scalar('Train/total_loss', total_loss, step)
writer.add_scalar('Train/value_loss', value_loss, step)
writer.add_scalar('Train/policy_loss', policy_loss, step)
writer.add_scalar('Train/grad_norm', grad_norm, step)

# Sanity check: overfit on a single batch first
# If loss doesn't decrease, something is fundamentally wrong
```

## Common Python Patterns

### Import / Module Issues

```python
import sys
print(sys.path)                # Search paths
print(module.__file__)         # Where module is loaded from
print(dir(module))             # What's available

# Verify native extension
import hmb_sim_cpp
print(hmb_sim_cpp.__file__)    # Should point to .so file
```

### Pickle / Serialization

```python
import cloudpickle
try:
    cloudpickle.dumps(obj)
    print("Object is picklable")
except Exception as e:
    print(f"Cannot pickle: {e}")
```
