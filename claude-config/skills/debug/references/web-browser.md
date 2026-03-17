# Web / Browser Debugging Reference

> **Note:** This reference is optional — intended for web/JS/Node.js projects.
> Not needed for Python/C++ ML projects.

## Chrome DevTools

```
Console    → View logs, errors, run JS expressions
Sources    → Set breakpoints, step through code
Network    → Inspect API calls, headers, response bodies
Application → View cookies, localStorage, sessionStorage, cache
Performance → Profile rendering, find jank, measure load times
Memory     → Heap snapshots, find memory leaks
```

## Node.js Debugging

```bash
# Launch with inspector
node --inspect app.js          # Attach debugger later
node --inspect-brk app.js     # Break on first line

# Then open chrome://inspect in Chrome
```

### VS Code Launch Config

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Program",
      "program": "${workspaceFolder}/src/index.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "--no-cache"]
    }
  ]
}
```

## Console API

```javascript
console.log('Value:', value);                    // Basic
console.table(arrayOfObjects);                   // Table format
console.time('op'); /* code */ console.timeEnd('op');  // Timing
console.trace();                                 // Stack trace
console.assert(x > 0, 'Must be positive');       // Assertion
console.group('Section'); /* logs */ console.groupEnd();  // Grouping
```

## Memory Leak Detection

```javascript
// Heap snapshot comparison:
// 1. Take snapshot in DevTools Memory tab
// 2. Perform suspected leaking action
// 3. Take another snapshot
// 4. Compare — look for growing object counts

// Node.js memory monitoring
if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
    console.warn('High memory:', process.memoryUsage());
    require('v8').writeHeapSnapshot();  // Generate heap dump
}
```

## Performance Profiling

```javascript
performance.mark('start');
// ... operation ...
performance.mark('end');
performance.measure('operation', 'start', 'end');
console.log(performance.getEntriesByType('measure'));
```

## Common JS Bug Patterns

```javascript
// Type coercion:  use === not ==
if (count === 0) { /* only true for 0 */ }

// Async without await
const result = await asyncFunction();  // Don't forget await

// Null/undefined chaining
const name = user?.profile?.name ?? 'Unknown';
```

## Git Bisect for Regressions

```bash
git bisect start
git bisect bad                 # Current commit is broken
git bisect good v1.0.0         # This old commit worked
# Git checks out middle commits — test each one
git bisect good   # or git bisect bad
# Repeat until found
git bisect reset  # When done
```
