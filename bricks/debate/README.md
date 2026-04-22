# @focus-mcp/debate

Structured multi-perspective debate — define positions, score arguments, find consensus, summarize.

## Tools

| Tool | Exposed as | Description |
|------|------------|-------------|
| `debate` | `dbt_debate` | Start a debate with a topic and an array of positions |
| `consensus` | `dbt_consensus` | Find common ground between positions |
| `score` | `dbt_score` | Score each position on relevance, evidence, feasibility |
| `summary` | `dbt_summary` | Summarize the debate with winner and key points |

## Usage

### 1. Start a debate

```json
{
  "topic": "Remote work vs office work",
  "positions": [
    { "role": "Remote advocate", "argument": "Remote work increases productivity." },
    { "role": "Office advocate", "argument": "Office work fosters collaboration." }
  ]
}
```

Returns `{ debateId, topic, positionCount }`.

### 2. Find consensus

```json
{ "debateId": "<id>" }
```

Returns `{ debateId, commonTerms, agreementAreas }`.

### 3. Score positions

```json
{
  "debateId": "<id>",
  "scores": [
    { "role": "Remote advocate", "relevance": 8, "evidence": 7, "feasibility": 9 },
    { "role": "Office advocate", "relevance": 7, "evidence": 6, "feasibility": 8 }
  ]
}
```

Returns `{ debateId, ranking }` sorted by weighted score (relevance 40%, evidence 35%, feasibility 25%).

### 4. Summarize

```json
{ "debateId": "<id>" }
```

Returns `{ debateId, topic, winner, keyPoints, agreementAreas, disagreementAreas, positionCount, scored }`.
