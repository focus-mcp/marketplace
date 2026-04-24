# Fiche brick — filediff

**Domaine** : File comparison — diff, patch, delta between files or versions.
**Prefix** : `fd`
**Tools** : 3 (`diff`, `patch`, `delta`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 638,019 | 140,873 | -77.9% |
| cache_creation | 20,468 | 14,818 | |
| cache_read | 611,852 | 123,168 | |
| output | 5,652 | 2,861 | |
| Turns (SDK) | 18 | 6 | |
| Duration (s) | 85.0 | 45.3 | -47% |

## Mini-task (iso)

Using the `diff` tool from the **filediff** brick (or equivalent native `diff -u`), compare these two files in the NestJS test-repo:

- File A: `test-repo/packages/platform-express/package.json`
- File B: `test-repo/packages/platform-fastify/package.json`

Produce the unified diff between them (A as the "before", B as the "after"). Then count:

1. **Added lines**: lines in the diff output that start with `+` but are NOT the `+++` header line.
2. **Removed lines**: lines in the diff output that start with `-` but are NOT the `---` header line.

Report the answer in this exact format:
```
Added: <integer>
Removed: <integer>
```

---

## Tool coverage (brick mode)

- `fd_diff` : called ✓
- `fd_patch` : not called ⚠️
- `fd_delta` : not called ⚠️

**Coverage score**: 1/3 tools used

## Answers comparison

**Native answer**: ```
  Added: 21
  Removed: 10
  ```
```

**Brick answer**: ```
  Added: 21
  Removed: 10
  ```
```

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-77.9%) and wall-clock improvement (duration ratio 0.53x). Agent completed the task with 1/3 tools (`fd_diff`). Answers match native ✓ (identical "Added: 21, Removed: 10"). The brick provides genuine leverage for file comparison tasks.
- `fd_patch` and `fd_delta` are write/application operations not needed for a read-only diff comparison task.

## Auto-detected issues

- Tools not called: `fd_patch`, `fd_delta`
- Turns > 15 (native): 18
- Brick notes flagged: fallback — "The `fd_diff` tool returned a clean unified diff. The diff hunk format used `@@ -L,N +L,N @@` notation. All `+` and `-` content lines were counted manually excluding the `+++`/`---` header lines. No f"

## Recommendations

- 🟢 Keep as-is — `fd_diff` is working as intended for comparison tasks.
- 📝 Consider enriching `fd_patch` and `fd_delta` descriptions so agents reach them for patch-apply and incremental-diff scenarios.
