<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP Marketplace — Product Requirements Document

> Périmètre : le **catalogue officiel** de briques (repo `marketplace/`).
> Pour la lib `@focus-mcp/core` : voir [`core/PRD.md`](../core/PRD.md). Pour l'app desktop : voir [`client/PRD.md`](../client/PRD.md).

## Vision (rappel)

**FocusMCP** — Focaliser les agents AI sur l'essentiel.

Le marketplace officiel est le **catalogue par défaut** intégré au client. Sans aucune brique installée, FocusMCP est une coquille vide ; le marketplace est l'endroit d'où l'utilisateur installe ce dont il a besoin. **Comme npm registry pour Node, Docker Hub pour Docker, marketplace VS Code pour les extensions.**

> **Granularité maximale, à la VS Code** — préférer 10 briques spécialisées à 1 brique monolithique. **Reject the kitchen sink.**

---

## Rôle du marketplace dans l'écosystème

Le repo `marketplace/` contient :

1. **L'index officiel** (`catalog.json`) — liste de toutes les briques publiées
2. **Le code source des briques officielles MVP** (focus-indexer, focus-memory, focus-sandbox, focus-thinking, etc.)
3. **Le process de soumission** pour les briques tierces souhaitant rejoindre l'officiel
4. **Les quality gates** appliqués à chaque brique (validation via `@focus-mcp/validator`)

```
┌──────────────────────────────────────────────┐
│ FocusMCP Client (Tauri)                      │
│  └─ Marketplace Manager (dans @focus-mcp/core)│
│       ├─ catalogue officiel ◄──┐             │
│       └─ catalogues tiers (P1) │             │
└────────────────────────────────┼─────────────┘
                                 │ HTTPS
                                 ▼
┌──────────────────────────────────────────────┐
│ marketplace/  (ce repo)                      │
│  ├─ catalog.json  (index publié)             │
│  ├─ bricks/  (sources des briques officielles)│
│  │   ├─ focus-indexer/                       │
│  │   ├─ focus-memory/                        │
│  │   └─ ...                                  │
│  └─ docs/                                    │
└──────────────────────────────────────────────┘
                                 │
                       Hosting : GitHub Pages
                       (catalog.json statique)
                       Code briques : releases GitHub
```

---

## Convention de nommage

`focus-<domaine>` ou `focus-<parent>-<sous-domaine>` :
- `focus-php`, `focus-twig`, `focus-doctrine`
- `focus-sf-router`, `focus-react-query`
- `focus-indexer`, `focus-memory`, `focus-sandbox`

Le nom **déclare sans ambiguïté** le domaine. Les briques fourre-tout (`focus-symfony` qui fait tout) sont **rejetées**.

---

## Format du catalogue (`catalog.json`)

```json
{
  "name": "focus-official",
  "description": "Marketplace officiel FocusMCP",
  "updated": "2026-04-15T00:00:00Z",
  "bricks": [
    {
      "name": "indexer",
      "version": "1.0.0",
      "description": "Indexation de fichiers avec cache FTS5",
      "source": "focus-mcp/marketplace/bricks/focus-indexer",
      "dependencies": [],
      "tags": ["core", "filesystem", "search"],
      "publisher": "focus-mcp",
      "license": "MIT"
    },
    {
      "name": "php",
      "version": "1.0.0",
      "description": "Compréhension avancée du langage PHP",
      "source": "focus-mcp/marketplace/bricks/focus-php",
      "dependencies": ["indexer"],
      "tags": ["language", "php"],
      "publisher": "focus-mcp",
      "license": "MIT"
    }
  ]
}
```

Le résolveur (côté `@focus-mcp/core` marketplace client) consomme ce JSON pour :
- Afficher dans la page Discover du client
- Résoudre `<name>@<range>` lors d'un `focus add <brick>`
- Télécharger depuis `source` (release GitHub) avec vérif intégrité

---

## Briques officielles MVP

Briques livrées par le marketplace officiel, qui matérialisent les **patterns d'optimisation des tokens** :

| Brique | Pattern | Description |
|---|---|---|
| **focus-indexer** | Indexation + cache | FS scan + FTS5/BM25, base partagée |
| **focus-memory** | Session memory | Persistance SQLite + FTS5, survit aux compactions |
| **focus-sandbox** | Think in code | Exécution JS éphémère (V8 isolé), accès FS via Tauri |
| **focus-thinking** | Reasoning externalisé | Chaînes de pensées, révisions, branches — persistées via `focus-memory` |

**Combo puissant** : `focus-thinking` + `focus-memory` = chaînes de raisonnement persistées entre sessions, retrouvables via FTS5/BM25.

### Briques P2 (post-MVP)

- **focus-worktree** — isolation git worktree pour exécutions parallèles (inspiré claude-octopus)
- **focus-reactor** — écoute événements externes (CI, PR, webhooks) et déclenche des briques

---

## Process de soumission

### Pour rejoindre le marketplace officiel

1. Fork du repo `marketplace/`
2. Créer `bricks/<focus-domaine>/` avec :
   - `mcp-brick.json` (manifeste valide)
   - Code source TypeScript (compilable via tsup)
   - Tests Vitest (coverage ≥ 80%)
   - `README.md` (description, usage, exemples)
   - `LICENSE` (MIT recommandé, autres open-source acceptés)
3. PR vers `develop` avec :
   - Description du domaine couvert
   - Justification : pourquoi pas couvert par une brique existante ?
   - Confirmation de l'atomicité (pas de kitchen sink)

### Quality gates (CI)

Chaque PR passe par :

| Gate | Outil | Échec si |
|---|---|---|
| **Manifeste valide** | `@focus-mcp/validator` | Schéma KO, namespace incorrect |
| **Conformance brique** | `@focus-mcp/validator` | Tools mal déclarés, dépendances non whitelist |
| **Build** | tsup | Erreur compilation |
| **Tests** | Vitest | Coverage < 80%, tests rouges |
| **Lint** | Biome | Erreurs lint |
| **License compliance** | REUSE | SPDX headers manquants |
| **SBOM** | cdxgen | Génération SBOM échoue |
| **Atomicité** | Review humaine | Brique fourre-tout → reject |

### Process review

- 2 approvals required (mainteneurs marketplace)
- Vérification manuelle : nom respecte la convention, description claire, pas de doublon
- Si OK : merge → release tag → mise à jour `catalog.json`

---

## Hosting

### Catalogue (`catalog.json`)

- **GitHub Pages** sur `marketplace.focus-mcp.dev` (ou GitHub Pages du repo)
- Fichier statique, mis à jour à chaque release via GitHub Action
- CDN-friendly (cache HTTP)
- ETag pour pulls efficaces côté client

### Code des briques

- **GitHub Releases** sur le repo `marketplace/` (tags signés)
- Format : tarball par brique (`focus-<name>-<version>.tgz`)
- sha256 publié dans `catalog.json` pour vérif intégrité

---

## Catalogues tiers (P1)

Le marketplace officiel n'est qu'un catalogue parmi d'autres. Les utilisateurs pourront ajouter :

- **GitHub org** : tous les repos `<org>/focus-*` deviennent un catalogue
- **URL HTTP** : pointer vers un `catalog.json` distant
- **Local** : dossier filesystem local (dev de briques)

Configuration via `.centerrc` (cf. `core/PRD.md`) :

```json
{
  "catalogs": [
    { "name": "official", "source": "focus-mcp/marketplace" },
    { "name": "company", "source": "https://internal.acme.com/focus-catalog.json" }
  ]
}
```

---

## Roadmap

### P0 — MVP

- [ ] Bootstrap repo `marketplace/` (structure, CI, REUSE, biome)
- [ ] `catalog.json` initial avec 4 briques officielles MVP
- [ ] `bricks/focus-indexer/` (FTS5 + BM25)
- [ ] `bricks/focus-memory/` (SQLite + FTS5, persistance session)
- [ ] `bricks/focus-sandbox/` (V8 isolé, "think in code")
- [ ] `bricks/focus-thinking/` (chaînes de pensées + persistance via memory)
- [ ] CI quality gates (validator, build, tests, REUSE, SBOM)
- [ ] Hosting GitHub Pages pour `catalog.json`
- [ ] Process de soumission documenté (`CONTRIBUTING.md`)

### P1

- [ ] **Catalogues tiers** supportés côté client (résolveur multi-source)
- [ ] **Auto-update** des briques (bump version → notif côté client)
- [ ] **Recherche full-text** dans `catalog.json` (tags, description)
- [ ] **Tier officiel / communauté** affiché distinctement
- [ ] **Statistiques** (téléchargements par brique)

### P2

- [ ] **Signature des releases** (GPG ou Sigstore)
- [ ] **Briques privées** (catalogue privé authentifié)
- [ ] **Documentation auteurs** complète (guide pas-à-pas pour publier sa brique)

---

## Stack technique

| Composant | Technologie | Rôle |
|---|---|---|
| Briques | **TypeScript strict** | Code source |
| Build | **tsup** | Bundling par brique |
| Tests | **Vitest** | Unit + intégration |
| Validator | **@focus-mcp/validator** | Quality gate conformance |
| Lint | **Biome** | Style et qualité |
| License | **REUSE** | SPDX headers |
| SBOM | **cdxgen** | Génération SBOM par release |
| Hosting catalogue | **GitHub Pages** | `catalog.json` statique |
| Hosting briques | **GitHub Releases** | Tarballs par version |
| CI | **GitHub Actions** | Quality gates + publish |

---

## Décisions clés

| Décision | Choix | Raison |
|---|---|---|
| **Granularité** | Atomique (1 brique = 1 domaine) | Compose comme VS Code plugins |
| **Reject kitchen sink** | Process review humain | Évite focus-symfony qui fait tout |
| **Catalogue** | JSON statique sur GitHub Pages | Simple, CDN, pas de backend |
| **Code briques** | GitHub Releases (tarballs) | Versionné, intégrité sha256 |
| **Multi-source** (P1) | Catalogues tiers | Officiel ≠ exclusif |
| **License** | MIT recommandé | Compat écosystème, pas obligatoire |
| **Quality gates** | CI obligatoire avant merge | Maintenir qualité du tier officiel |

---

## Inspirations

- **VS Code marketplace** — modèle officiel + tiers, qualité, granularité plugins
- **npm registry** — graphe de dépendances, sha256, lockfile
- **Claude Code Plugins** — format de catalogue, mécanisme d'installation
- **Docker Hub** — séparation runtime / catalogue, releases versionnées
