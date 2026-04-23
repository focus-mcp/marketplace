# @focusmcp/convert

Convert between formats and units — unit conversion, encoding, format transformation, naming conventions.

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `units` | `conv_units` | Convert between byte sizes, time durations, or tokens to cost |
| `encoding` | `conv_encoding` | Encode/decode base64, hex, URL, or HTML entities |
| `format` | `conv_format` | Transform data between JSON, CSV, and YAML |
| `language` | `conv_language` | Convert naming conventions (camelCase, snake_case, kebab-case, PascalCase) |

## Supported conversions

### `units`

| Category | Units |
|----------|-------|
| Bytes | `b`, `kb`, `mb`, `gb` |
| Time | `ms`, `s`, `m`, `h` |
| Tokens | `tokens` → `cost` (requires `pricePerMillion`) |

### `encoding`

| Operation | Description |
|-----------|-------------|
| `base64encode` / `base64decode` | Base64 encoding |
| `hexencode` / `hexdecode` | Hexadecimal encoding |
| `urlencode` / `urldecode` | Percent-encoding (RFC 3986) |
| `htmlescape` / `htmlunescape` | HTML entity escaping |

### `format`

| From | To |
|------|----|
| `json` | `csv`, `yaml` |
| `csv` | `json`, `yaml` |

### `language`

| Convention | Example |
|------------|---------|
| `camel` | `myVariableName` |
| `snake` | `my_variable_name` |
| `kebab` | `my-variable-name` |
| `pascal` | `MyVariableName` |
