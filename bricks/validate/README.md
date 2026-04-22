# @focusmcp/validate

Validate data — JSON syntax, JSON Schema compliance, TypeScript type checking, lint rules.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `json` | `val_json` | Validate JSON syntax — check if a string is valid JSON, report errors |
| `schema` | `val_schema` | Validate data against a JSON Schema (type, required, properties, items) |
| `types` | `val_types` | Check TypeScript type annotations — find `any`, missing return types, implicit any |
| `lint` | `val_lint` | Apply lint rules — unused imports, console.log, TODO/FIXME, debugger statements |

## JSON Schema subset

The `schema` tool supports the following JSON Schema keywords:

- `type` — scalar or array of types: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`
- `required` — array of required property names (object only)
- `properties` — map of property name to sub-schema (object only)
- `items` — sub-schema applied to every array element (array only)

No external dependencies — validation is implemented as a pure recursive function.

## TypeScript type analysis

The `types` tool performs static regex-based analysis (no compiler invoked):

| Issue type | What is detected |
|-----------|-----------------|
| `explicit-any` | `: any` annotation on any token |
| `missing-return-type` | `function` declaration without `: ReturnType` after the closing param paren |
| `implicit-any` | Function parameters without `: Type` annotation |

A **score** (0–100) is returned: starts at 100, minus 10 per issue, floored at 0.

## Lint rules

| Rule | What is flagged |
|------|----------------|
| `unused-import` | Named import never referenced outside its import line |
| `no-console-log` | `console.log(...)` call |
| `no-debugger` | `debugger` statement |
| `todo-fixme` | `TODO` or `FIXME` comment marker |
