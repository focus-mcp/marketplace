# Fiche brick — overview

**Domaine** : Project-level understanding without reading all files — detect framework, language, conventions, and architecture.
**Prefix** : `ovw`
**Tools** : 4 (`project`, `architecture`, `conventions`, `dependencies`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 862,572 | 269,194 | -68.8% |
| cache_creation | 48,354 | 26,555 | |
| cache_read | 807,715 | 237,331 | |
| output | 6,456 | 5,257 | |
| Turns (SDK) | 18 | 9 | |
| Duration (s) | 121.8 | 105.3 | -14% |

## Mini-task (iso)

Using the `conventions` tool from the **overview** brick, determine the coding conventions in use across the NestJS monorepo located at `test-repo/`.

Specifically, identify and report each of the following four properties, exactly as configured:

1. **Quote style** — are TypeScript source files written with single quotes or double quotes?
2. **Trailing comma setting** — what is the configured trailing-comma mode (e.g. `none`, `es5`, or `all`)?
3. **Arrow function parentheses setting** — are arrow-function single parameters always parenthesized, or is parenthesizing avoided (`always` vs `avoid`)?
4. **Import style** — do TypeScript source files use ES-module `import … from …` syntax or CommonJS `require()` calls?

Expected answer format — four lines, one per property, in this order:

```
quotes: <single|double>
trailingComma: <none|es5|all>
arrowParens: <always|avoid>
importStyle: <esmodule|commonjs>
```

The source of truth for properties 1–3 is `test-repo/.prettierrc`. Property 4 must be verified in actual TypeScript source files (e.g. `test-repo/packages/common/index.ts` or `test-repo/packages/core/nest-factory.ts`).

---

## Tool coverage (brick mode)

- `ovw_project` : called ✓
- `ovw_architecture` : not called ⚠️
- `ovw_conventions` : called ✓
- `ovw_dependencies` : not called ⚠️

**Coverage score**: 2/4 tools used

## Answers comparison

**Native answer**: ```
  quotes: single
  trailingComma: all
  arrowParens: avoid
  importStyle: esmodule
  ```
```

**Brick answer**: ```
quotes: single
trailingComma: <not returned by brick tool>
arrowParens: <not returned by brick tool>
importStyle: commonjs
```

**Match**: divergent (manual check needed)

## Observations

- Good token savings (Δ=-68.8%) and modest wall-clock improvement (-14%). Coverage 2/4 — agent used `ovw_project` and `ovw_conventions`. Answers diverge: `ovw_conventions` returned `importStyle: commonjs` where the correct answer is `esmodule`, and it didn't return `trailingComma` or `arrowParens`.
- The `ovw_conventions` tool has a detection gap: it reads config files but misclassifies ES module imports and doesn't extract all prettier settings.
- `ovw_architecture` and `ovw_dependencies` are not called because the task specifically requested conventions only.

## Auto-detected issues

- Tools not called: `ovw_architecture`, `ovw_dependencies`
- Turns > 15 (native): 18
- Brick notes flagged: limitation — "The `mcp__focus__ovw_conventions` tool returned `{"indent":"spaces:2","quotes":"single","semicolons":false,"importStyle":"commonjs","lineEnding":"lf"}`. It successfully answers properties 1 (quotes: s"

## Recommendations

- 🔧 Fix `ovw_conventions` to: (1) detect ES module imports correctly by inspecting source files, (2) extract `trailingComma` and `arrowParens` from `.prettierrc`.
- 📝 Partial coverage (2/4 required fields) should be reflected in any marketing claims about conventions detection accuracy.
