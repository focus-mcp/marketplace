---
---

Add Wave 5.4 integration tests for convert, format, and diagram bricks.
- convert: 5 scenarios (conv_units/happy MB→KB, conv_units/incompatible-types adversarial kb→ms throws, conv_encoding/happy base64, conv_format/happy JSON→YAML, conv_language/happy camelCase→snake_case)
- format: 4 scenarios (fmt_json/happy multi-line, fmt_yaml/happy keys check, fmt_markdown/happy list style, fmt_table/happy ASCII borders)
- diagram: 4 scenarios (diag_mermaid/happy flowchart prefix, diag_mermaid/empty-graph adversarial minimal valid, diag_dot/happy digraph with arrow, diag_ascii/happy chain box chars)
- all 3 bricks: added test:integration script + @focus-mcp/marketplace-testing devDependency
