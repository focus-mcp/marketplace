<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# echo

Hello-world brick for FocusMCP — returns the message it receives.

Its sole purpose is to serve as a **smoke test of the FocusMCP pipeline**: manifest parsing, brick loader, Registry, Router, EventBus. If `echo_say` responds, the whole plumbing works.

Also serves as a **minimal template** for brick authors: structure, manifest, tests, Changesets.

## Exposed tool

| Name | Description | Input | Output |
|---|---|---|---|
| `echo_say` | Returns the received message as-is | `{ message: string }` | `{ message: string }` |

## Example

Request:

```json
{ "name": "echo_say", "arguments": { "message": "hello" } }
```

Response:

```json
{ "message": "hello" }
```

## Dependencies

None — fully self-contained, no runtime dependencies (not even `@focusmcp/sdk`). Structural types inlined to keep the brick independent.

## License

MIT — see [LICENSE](../../LICENSE).
