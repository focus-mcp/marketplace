<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# FocusMCP CLI Manager — Product Requirements Document

> Périmètre : le **dashboard web optionnel** (repo `cli-manager/`).
> Pour la lib `@focusmcp/core` : voir [`core/VISION.md`](../../../core/VISION.md). Pour la CLI : voir [`cli/VISION.md`](../../../cli/VISION.md). Pour le marketplace : voir [`marketplace/VISION.md`](../../VISION.md).

## Vision (rappel)

**FocusMCP** — Focaliser les agents AI sur l'essentiel.

Le `cli-manager` est le **compagnon optionnel** de `@focusmcp/cli`. Il n'est **pas nécessaire** pour utiliser FocusMCP : la CLI fait tout le travail opérationnel (install, remove, enable, configure des briques). Le manager est la **vitre d'observation** posée au-dessus d'un orchestrateur déjà en marche — comme un `htop` pour FocusMCP.

---

## Rôle du cli-manager dans l'écosystème

Le repo `cli-manager/` fournit :

1. **Un dashboard web statique** (SvelteKit prerendered, aucune partie serveur)
2. **Un client HTTP** qui consomme l'API admin exposée par `@focusmcp/cli --admin-api`
3. **Des vues read-only** : briques, métriques, logs, graphe de dépendances

**Hors périmètre** :

- Installer / supprimer / activer / désactiver des briques (→ CLI)
- Éditer la configuration runtime (→ CLI)
- Héberger des secrets, des sessions utilisateur, une base de données
- Dépendre de `@focusmcp/core` (le manager est découplé, il ne parle que HTTP)

---

## Architecture

```
Browser (utilisateur)
    │ HTTP + SSE
    ▼
cli-manager (static bundle, prerendered SvelteKit)
    │ fetch(baseUrl + token)
    ▼
@focusmcp/cli avec `--admin-api` activé
    │
    ▼
@focusmcp/core (runtime orchestrateur, briques en mémoire)
```

- Le manager est **100 % client-side**. Aucune route `+page.server.ts`, aucune route `+server.ts`. `adapter-static` produit un dossier `build/` qui peut être servi par n'importe quel serveur de fichiers statiques (GitHub Pages, Cloudflare Pages, S3, `npx serve`).
- L'authentification se fait via un **token unique** généré par la CLI au démarrage (`focus start --admin-api` → token affiché en console → user le colle dans le manager).
- Les flux temps réel (logs, métriques) passent par **SSE** (`EventSource`), pas de WebSocket pour garder la surface serveur minimale côté CLI.

---

## Positionnement

| Axe | Valeur |
|---|---|
| **Essentiel au MVP ?** | Non — la CLI seule suffit |
| **Phase** | Phase 2 (scaffold en P0, features en P1/P2) |
| **Utilisateurs ciblés** | Développeurs curieux qui veulent visualiser ce que fait leur CLI ; mainteneurs de briques qui veulent debugger ; démos et screenshots |
| **Alternative** | `focus status`, `focus logs`, `focus metrics` (commandes CLI équivalentes, déjà dans la CLI) |

Le manager est un **plus qualitatif**, pas un bloquant. Un utilisateur qui n'ouvre jamais son navigateur doit pouvoir utiliser FocusMCP à 100 %.

---

## Fonctionnalités (backlog)

Toutes les fonctionnalités listées ici sont **différées** — ce repo ne contient aujourd'hui que le scaffold (pages vides).

### P1 — Observation basique

- **Dashboard briques installées + statut** — liste, version, état (loaded / error / disabled), dépendances résolues.
- **Métriques live** — latency par brique, counters, erreurs, guards déclenchés. Rafraîchissement à la seconde.
- **Connexion** — formulaire `baseUrl + token`, test de santé (`GET /v1/health`), persistance uniquement en mémoire (pas de `localStorage` pour les tokens).

### P2 — Temps réel + graphe

- **Logs stream** — EventBus events en temps réel via SSE (`GET /v1/events`), filtrage par brique / sévérité, buffer circulaire côté client.
- **Graph dépendances** — visualisation DAG des briques chargées (lib : peut-être `d3-hierarchy` ou `cytoscape`, à décider via ADR).
- **Catalog browser** — navigation du marketplace officiel + updates disponibles pour les briques installées (lecture seule ; l'install reste côté CLI).

### P3 — Qualité de vie

- **Thème clair / sombre**
- **Export** des logs et métriques (CSV, JSON)
- **Snapshots** — capture d'un instant T pour partage (bug reports)
- **i18n** (en / fr)

---

## Distribution

### Phase 2 — `npx @focusmcp/cli-manager`

```bash
npx @focusmcp/cli-manager --port 5174
# → sert le bundle statique
# → ouvre le navigateur
# → l'utilisateur colle baseUrl + token
```

Implémentation : `package.json` `bin` pointant vers un petit script qui sert `build/` avec un serveur statique minimal (`sirv` ou équivalent) et lance le browser.

### Phase 2 (variante) — hébergé sur `manager.focusmcp.dev`

- Publication du bundle statique sur GitHub Pages (ou Cloudflare Pages).
- Custom domain `manager.focusmcp.dev`.
- Même binaire que `npx`, juste hébergé.
- **Attention CORS** : le CLI doit autoriser explicitement `https://manager.focusmcp.dev` en plus de `http://localhost:*`. Opt-in côté CLI (flag `--admin-api-allow-origin=https://manager.focusmcp.dev`).

---

## Connexion à la CLI

### Flow utilisateur

1. L'utilisateur lance `focus start --admin-api`.
2. La CLI affiche en console quelque chose comme :
   ```
   Admin API listening on http://localhost:4311
   Admin token (copy to your manager): xxxxxxxxxxxxxxxx
   ```
3. L'utilisateur ouvre le manager (`npx @focusmcp/cli-manager` ou `manager.focusmcp.dev`).
4. Dans le formulaire de connexion, il colle la baseUrl et le token.
5. Le manager appelle `GET /v1/health` avec le token en `Authorization: Bearer <token>`.
6. Les autres vues (bricks, metrics, logs, graph) consomment leurs endpoints respectifs.

### Endpoints consommés (contrat côté CLI)

| Endpoint | Méthode | Rôle | Phase |
|---|---|---|---|
| `/v1/health` | GET | Sanity check + ping | P1 |
| `/v1/bricks` | GET | Liste des briques chargées | P1 |
| `/v1/metrics` | GET | Snapshot métriques | P1 |
| `/v1/events` | GET (SSE) | Flux EventBus temps réel | P2 |

Le contrat côté manager est défini dans [`src/lib/api-client.ts`](./src/lib/api-client.ts) (stub actuellement, lève `Not implemented`).

---

## Sécurité

- **Bundle 100 % statique** — aucune exécution server-side, aucun secret dans le bundle.
- **Token en mémoire uniquement** — pas de `localStorage` / `sessionStorage` par défaut. Un utilisateur qui recharge la page doit re-coller son token. C'est **voulu** : pas de token qui traîne dans un stockage persistant.
- **CORS strict** — contrôlé par la CLI. Par défaut, seul `http://localhost:*` est autorisé. Le mode hosted nécessite une opt-in explicite côté CLI.
- **Escaping** — Svelte échappe les strings par défaut ; pas d'usage de `{@html}` sur du contenu venant de la CLI.
- **Pas de télémétrie** — aucun analytics, aucun tracker, aucun fetch vers un domaine tiers.
- **CSP stricte** — en mode hosted, une `Content-Security-Policy` interdira tout `script-src` hors self.

---

## Stack technique

| Composant | Technologie | Rôle |
|---|---|---|
| Framework | **SvelteKit** (Svelte 5 runes) | Pages + routing |
| Output | **`@sveltejs/adapter-static`** | Bundle statique, zéro SSR |
| Styling | **Tailwind CSS** | Utility-first |
| Types | **TypeScript strict** | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Tests | **Vitest** | Unit (src/lib/**/*.ts) |
| Typecheck Svelte | **svelte-check** | Erreurs `.svelte` |
| Lint / Format | **Biome 2.x** | `.ts`, `.js`, `.json`, `.md` |
| Release | **stable-publish.yml** | Tag + publish sur npm (@focus-mcp/manager, Phase 2) |
| Commits | **commitlint** + **husky** | Conventional Commits |
| License | **REUSE** | SPDX headers |
| CI | **GitHub Actions** | Lint, typecheck, test, build, CodeQL, gitleaks |

---

## Décisions clés

| Décision | Choix | Raison |
|---|---|---|
| **Framework UI** | SvelteKit (Svelte 5) | Bundle léger, DX excellente, runes modernes |
| **Output** | `adapter-static` + prerender | Zéro backend, hostable partout, simple à distribuer |
| **Pas de `@focusmcp/core`** | Dépendance HTTP uniquement | Manager découplé : peut être remplacé, réécrit, dupliqué sans toucher le core |
| **Styling** | Tailwind | Cohérence avec l'écosystème client, pas de design-system custom à maintenir |
| **Auth** | Token simple (pas OAuth/OIDC) | Outil local, token one-off généré par la CLI, complexité minimale |
| **Storage** | En mémoire uniquement | Pas de secret qui traîne, rechargement = re-connexion consciente |
| **Temps réel** | SSE (pas WebSocket) | Lecture seule, unidirectionnel suffit, surface CLI minimale |
| **Tests** | Vitest sur `src/lib` | `.svelte` couvert par svelte-check ; pas de framework component test au MVP |
| **Distribution** | `npx` + hosted optionnel | Deux modes, même bundle |

---

## Roadmap

### P0 — Scaffold (ce repo actuellement)

- [x] Bootstrap repo `cli-manager/` (structure, CI, REUSE, biome, husky)
- [x] SvelteKit + adapter-static + Tailwind + Vitest
- [x] Pages vides : Home, Bricks, Logs, Metrics, Graph
- [x] Client admin API en stub (contrat TypeScript, lève `Not implemented`)
- [x] Docs publiques (README, CONTRIBUTING, AGENTS, CODE_OF_CONDUCT, SECURITY) en anglais
- [x] PRD (ce document) en français

### P1 — Consommation basique de l'API admin

- [ ] Endpoint `/v1/health` consommé par l'écran de connexion
- [ ] Liste briques via `/v1/bricks`
- [ ] Snapshot métriques via `/v1/metrics`
- [ ] Persistance de la connexion (session-level, jamais localStorage)
- [ ] Tests unitaires sur le client HTTP (mocks `fetch`)

### P2 — Temps réel + graphe + catalog

- [ ] Stream SSE des events (`/v1/events`)
- [ ] Graph DAG dépendances
- [ ] Catalog browser (marketplace officiel, updates disponibles)
- [ ] Distribution `npx @focusmcp/cli-manager`
- [ ] Hosted version sur `manager.focusmcp.dev`

### P3 — Qualité de vie

- [ ] Thème clair / sombre
- [ ] Export logs / métriques (CSV / JSON)
- [ ] Snapshots partageables
- [ ] i18n (en / fr)

---

## Inspirations

- **Docker Desktop** — dashboard optionnel par-dessus un démon CLI
- **pgAdmin / DBeaver** — GUI optionnelle sur un backend headless
- **htop / btop** — observation read-only, aucune action mutative
- **Grafana** — dashboards sur flux temps réel (mais Grafana fait bien plus, ici on reste minimaliste)
