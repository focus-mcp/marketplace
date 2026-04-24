# Fiche brick — format

**Domaine** : Format data into various output formats — pretty JSON, YAML, markdown, ASCII tables.
**Prefix** : `fmt`
**Tools** : 4 (`json`, `yaml`, `markdown`, `table`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 655,745 | 150,887 | -77.0% |
| cache_creation | 35,258 | 28,269 | |
| cache_read | 613,617 | 119,306 | |
| output | 6,829 | 3,285 | |
| Turns (SDK) | 15 | 6 | |
| Duration (s) | 117.2 | 59.7 | -49% |

## Mini-task (iso)

In the NestJS monorepo at `test-repo/`, there are package subdirectories under `test-repo/packages/` (e.g. `common`, `core`, `microservices`, etc.), each containing a `package.json` file. For every such directory that has a `package.json`:

1. Read the `name` field (the npm package name, e.g. `@nestjs/common`).
2. Count the number of entries in the `dependencies` field only (exclude `devDependencies` and `peerDependencies`).

Using the brick's `table` tool, format the results as an ASCII table with `+--+` borders, two columns — **Package** (left-aligned) and **Dep Count** (left-aligned) — with rows sorted alphabetically by package name.

The expected output is an ASCII table with exactly this structure (the `table` tool must receive `headers: ["Package", "Dep Count"]` and `rows` as an array of `[name, depCount]` string pairs, sorted alphabetically):

```
+----------------------------+-----------+
| Package                    | Dep Count |
+----------------------------+-----------+
| @nestjs/common             | 5         |
| @nestjs/core               | 6         |
| @nestjs/microservices      | 2         |
| @nestjs/platform-express   | 5         |
| @nestjs/platform-fastify   | 10        |
| @nestjs/platform-socket.io | 2         |
| @nestjs/platform-ws        | 2         |
| @nestjs/testing            | 1         |
| @nestjs/websockets         | 3         |
+----------------------------+-----------+
```

Report the final rendered ASCII table as your answer.

---

## Tool coverage (brick mode)

- `fmt_json` : not called ⚠️
- `fmt_yaml` : not called ⚠️
- `fmt_markdown` : not called ⚠️
- `fmt_table` : called ✓

**Coverage score**: 1/4 tools used

## Answers comparison

**Native answer**: ```
+----------------------------+-----------+
| Package                    | Dep Count |
+----------------------------+-----------+
| @nestjs/common             | 5         |
| @nestjs/core               | 6         |
... (13 total)
```

**Brick answer**: ```
+----------------------------+-----------+
| Package                    | Dep Count |
+----------------------------+-----------+
| @nestjs/common             | 5         |
| @nestjs/core               | 6         |
... (13 total)
```

**Match**: ✓ identical

## Observations

- Strong token savings (Δ=-77%) and wall-clock improvement (duration ratio 0.51x). Agent completed the task with 1/4 tools (`fmt_table`). Answers match native ✓ (identical ASCII table). The brick provides genuine leverage for data formatting tasks.
- The task asked for an ASCII table with specific `+--+` borders — `fmt_table` is the exact right tool. `fmt_json`, `fmt_yaml`, and `fmt_markdown` serve different output format scenarios.

## Auto-detected issues

- Tools not called: `fmt_json`, `fmt_yaml`, `fmt_markdown`

## Recommendations

- 🟢 Keep as-is — `fmt_table` is working as intended.
- 📝 Consider enriching sibling tool descriptions so agents reach them for JSON/YAML/Markdown output requests.
