# Ray Distributed Debugging Reference

## Actor Lifecycle Issues

### Common Error Types

| Error | Meaning | Check |
| --- | --- | --- |
| `RayActorError` | Actor process crashed | Check actor logs, OOM, segfault in native code |
| `ObjectLostError` | Object evicted from store | Reduce concurrent objects, increase store size |
| `WorkerCrashedError` | Worker process died | Check GPU OOM, native extension crash |
| `RayTaskError` | Exception inside task | Read the nested exception traceback |

### Actor Creation Debugging

```python
# Check available resources before creating actors
print(ray.available_resources())
# {'CPU': 12.0, 'GPU': 1.0, 'memory': ...}

# If actors won't start, check resource requests vs available
@ray.remote(num_gpus=0.31, num_cpus=6)
class MyActor:
    pass
# This needs 0.31 GPU + 6 CPU per actor — verify you have enough
```

### Actor Cleanup

```python
# Kill actors explicitly to free resources
ray.kill(actor_handle)

# Full shutdown (end of training)
ray.shutdown()

# Check for leaked actors
ray.util.state.list_actors()  # Ray 2.x state API
```

## Weight Synchronization

### Object Store Pattern

```python
# GOOD: Use ray.put() to avoid repeated serialization
weights = network.state_dict()
weights_ref = ray.put(weights)  # Serialize once, share via Object Store

# Send ref to multiple actors (no re-serialization)
futures = [actor.update_weights.remote(weights_ref) for actor in actors]
ray.get(futures)

# BAD: Passing weights directly (serializes per actor)
# futures = [actor.update_weights.remote(weights) for actor in actors]  # Slow!
```

### Object Store Pressure

Symptoms: `ObjectLostError`, slow `ray.get()`, memory warnings

```python
# Check Object Store usage
ray.internal.internal_api.memory_summary()

# Reduce pressure:
# 1. Fewer concurrent objects in flight
# 2. Smaller trajectory objects (compress if needed)
# 3. del references when done
# 4. Increase store size: ray.init(object_store_memory=4_000_000_000)
```

## Serialization Debugging

```python
import cloudpickle

# Test if an object can be serialized
def check_serializable(obj, name="object"):
    try:
        data = cloudpickle.dumps(obj)
        print(f"{name}: serializable, size={len(data)/1024:.1f}KB")
    except Exception as e:
        print(f"{name}: NOT serializable — {e}")

# Common issues:
# - Lambda/closure capturing large state
# - Open file handles or sockets
# - CUDA tensors (must move to CPU first)
# - C extension objects without pickle support
```

## Logging in Ray Actors

```python
import logging

@ray.remote
class MyActor:
    def __init__(self):
        # Each actor needs its own logger
        self.logger = logging.getLogger(f"Actor-{ray.get_runtime_context().get_actor_id()}")
        self.logger.setLevel(logging.DEBUG)

# Global: disable Ray log deduplication
import os
os.environ["RAY_DEDUP_LOGS"] = "0"  # Set BEFORE ray.init()
ray.init()
```

## Debugging Distributed Training Issues

### Hang Detection

If `ray.get()` hangs:

1. Check actor logs for exceptions
2. Check if actors are alive: `ray.util.state.list_actors()`
3. Check resource availability: `ray.available_resources()`
4. Add timeout: `ray.get(future, timeout=60)`

### GPU Issues in Workers

```python
@ray.remote(num_gpus=0.31)
class GPUActor:
    def __init__(self):
        # Verify GPU is visible
        import torch
        print(f"CUDA available: {torch.cuda.is_available()}")
        print(f"Device count: {torch.cuda.device_count()}")
        if torch.cuda.is_available():
            print(f"Device: {torch.cuda.get_device_name(0)}")
```

### Process Management

```python
import psutil

# Find and clean up orphan processes (e.g., TensorBoard)
for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
    if 'tensorboard' in str(proc.info['cmdline']):
        print(f"Found TensorBoard: PID={proc.info['pid']}")
        # proc.kill()  # Uncomment to clean up
```
