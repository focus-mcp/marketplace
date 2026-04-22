# @focus-mcp/decision

Structured decision-making — define options, analyze tradeoffs, get recommendations, and record decisions (ADR-style).

## Tools

| Tool | Exposed as | Description |
|------|-----------|-------------|
| `options` | `dec_options` | Define a decision question with labeled options and optional pros/cons |
| `tradeoffs` | `dec_tradeoffs` | Add evaluation criteria with weights and score each option |
| `recommend` | `dec_recommend` | Get a ranked recommendation based on weighted scores |
| `record` | `dec_record` | Record the final chosen option with rationale, optionally persisted to JSON |

## Usage

```
1. dec_options  → define the question and options → get decisionId
2. dec_tradeoffs → add criteria + scores per option
3. dec_recommend → get ranked recommendation
4. dec_record   → record the final choice with rationale
```
