# @focusmcp/codemod

Composite codemod brick for FocusMCP — loads all code modification sub-bricks.

This is a **composite brick**: it depends on `symbol`, `rename`, `codeedit`, `inline`, and `textsearch`.
It exposes no tools of its own — the runtime loads and registers all sub-bricks automatically.

## Dependencies

| Brick | Prefix | Description |
|-------|--------|-------------|
| `symbol` | `sym` | Symbol lookup and navigation (definitions, references, usages) |
| `rename` | `ren` | Rename symbols across a codebase |
| `codeedit` | `ce` | Structured code edits (insert, replace, delete ranges) |
| `inline` | `inl` | Inline variables, functions, and expressions |
| `textsearch` | `ts` | Text search and replace across files |
