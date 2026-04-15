<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# echo

Hello-world brique pour FocusMCP — retourne le message qu'elle reçoit.

Son seul but est de servir de **smoke test du pipeline FocusMCP** : manifest parsing, loader, Registry, Router, EventBus. Si `echo_say` répond, toute la plomberie fonctionne.

Sert aussi de **template minimal** pour les auteurs de briques : structure, manifest, tests, Changesets.

## Tool exposé

| Nom | Description | Input | Output |
|---|---|---|---|
| `echo_say` | Retourne le message reçu tel quel | `{ message: string }` | `{ message: string }` |

## Exemple

```json
// Requête
{ "name": "echo_say", "arguments": { "message": "hello" } }

// Réponse
{ "message": "hello" }
```

## Dépendances

Aucune — brique autonome, aucune dépendance runtime (pas même `@focusmcp/sdk`). Types structurels inlinés pour rester self-contained.

## License

MIT — voir [LICENSE](../../LICENSE).
