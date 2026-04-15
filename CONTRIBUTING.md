<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Contribuer à la marketplace FocusMCP

Merci de ton intérêt pour la marketplace FocusMCP. Ce document décrit **comment proposer une brique** et les règles de qualité exigées.

## Code of Conduct

Tous les contributeurs s'engagent à respecter le [Code of Conduct](./CODE_OF_CONDUCT.md).

## Processus de soumission

1. **Ouvre une issue** via le template « Brick submission » (atomicité, domaine, licence).
2. Attends la validation par un mainteneur — l'objectif est d'éviter les doublons et les briques fourre-tout.
3. **Ouvre une PR** sur la branche `develop` :
   - soit en ajoutant `bricks/<name>/` (brique hébergée dans ce repo),
   - soit en ajoutant une entrée dans `external_bricks.json` (brique hébergée ailleurs, avec `source.type = "url"` ou `"git-subdir"`).
4. La PR doit passer **toute la CI** : lint, typecheck, tests, REUSE, gitleaks, build du catalogue.

## Structure d'une brique locale

```
bricks/<name>/
  mcp-brick.json        — manifeste (obligatoire)
  package.json          — `name: "focus-<name>"`, `version`, `private: true`, `type: "module"`
  src/
    index.ts
    ...
  tests/ (ou *.test.ts à côté)
  README.md             — documentation de la brique
  LICENSE               — MIT (ou licence compatible MIT)
```

### Manifeste `mcp-brick.json`

Champs obligatoires :

- `name` (kebab-case, sans préfixe `focus-`)
- `description`
- `dependencies` (tableau des noms de briques requises, peut être vide)
- `tools` (tableau `{name, description, inputSchema}`)

Champs optionnels : `tags`, `license`, `homepage`, `publisher`.

La `version` n'apparaît **pas** dans le manifeste : elle est lue depuis `package.json` pour rester la source de vérité unique de Changesets.

## Règles non-négociables

1. **Atomicité** — 1 brique = 1 domaine. Pas de brique fourre-tout. Si deux responsabilités cohabitent, il faut deux briques.
2. **Nommage** — kebab-case, convention `focus-<domaine>` (le préfixe `focus-` va sur le package npm / tarball, le `name` du manifeste est sans préfixe).
3. **Licence MIT-compatible** — GPL/AGPL refusées pour préserver la licence du projet.
4. **TDD / Coverage ≥ 80 %** — tests exigés, couverture bloquante en CI.
5. **SPDX headers** dans tous les fichiers source (`SPDX-FileCopyrightText: 2026 FocusMCP contributors` + `SPDX-License-Identifier: MIT`). Pour les JSON, créer un fichier `.license` à côté (convention REUSE).
6. **TypeScript strict** — pas de `any`, pas de `console.log` (passer par le logger du core), ESM only.
7. **Conventional Commits** — enforced par commitlint (`feat(indexer): ...`, `fix(memory): ...`).
8. **Changeset obligatoire** pour toute PR qui touche une brique (`pnpm changeset`). Le mode est `independent` : chaque brique a sa propre version.

## Quality gates

Avant d'ouvrir une PR :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build:catalog     # valide la structure du catalogue avec le JSON Schema
pnpm reuse             # REUSE compliance (headers SPDX)
```

## Revue

Les mainteneurs vérifient :

- la pertinence du domaine (atomicité, absence de doublon) ;
- la qualité du code (tests, typage, lint) ;
- la conformité du manifeste au JSON Schema ;
- la cohérence du catalogue généré.

## Sécurité

Les vulnérabilités doivent être reportées **en privé** — voir [SECURITY.md](./SECURITY.md).
