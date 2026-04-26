<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Patch Queue — FocusMCP bench optimizations

Live notes accumulated during the Phase 2a sweep (62 atomic bricks × NestJS, iso-task).
Each entry: brick + observed signal + suspected root cause + proposed action + priority.

**Status legend** : 🚨 blocker · ⚠️ high · 🔧 medium · 📝 low

---

## ✅ Section 1 — FIXED (smoking guns confirmés, fixés sur npm)

### `fileops` 1.3.0 — +379% tokens, 5.82× latence

**npm version** : 1.3.0  
**Root cause** : `_workRoot` initialisé à `resolve(process.cwd())` au chargement du module (directory du serveur MCP, pas du repo de tâche). Le brick résolvait les chemins relatifs contre le mauvais répertoire → ENOENT → l'agent retryait, appelait des outils supplémentaires, divergeait. Le token explosion et le spike de durée étaient des retries/misdirection, PAS du bloat payload (chaque réponse outil < 200 B).

**Fix (PR #111)** :
1. ✅ P0 — guard `_resolveAndCheck()` : si `_workRootExplicitlySet` est false et le path résolu n'existe pas, throw : `"workRoot not set: call fileops:setRoot first..."`.
2. ✅ P1 — manifest descriptions : chaque outil annonce `"Requires fileops:setRoot to be called first with the workspace root path."`.
3. 📌 P2 — per-call root : NOT implemented (trop invasif, deferred).

**Retro-compat** : path qui existe sous le default workRoot passe toujours (pas de setRoot requis pour CLI où cwd EST le workspace).  
**Files** : `bricks/fileops/src/operations.ts` (lines 15-16, 30-53)

---

### `parallel` 1.1.1 — +79% tokens, +874% latence (9× slower)

**npm version** : 1.1.1  
**Root cause** : la Map `runs` stockait les `ParallelRun` complets (stdout/stderr entier de chaque tâche) sans borne de taille ni TTL. Pour N tâches avec output verbeux, la Map grossissait indéfiniment. Le pattern 2-steps run→collect forçait 2 MCP round-trips (explique le spike de latence).

**Fix (PR #138)** :
- ✅ P0 — cap UTF-8 byte-safe : `TaskResult.stdout` / `TaskResult.stderr` capés à 4KB par champ, `[truncated]` suffix.
- ✅ P0 — FIFO eviction : Map `runs` bornée à 100 entries maximum.
- 📌 P2 — effondrement run+collect en un seul appel : deferred (API change invasif — voir Section 4).

**Files** : `bricks/parallel/src/operations.ts` (lines 91-97 state, 203-237 parRun, 241-256 parCollect)

---

### `sandbox` 1.2.1 — +42% tokens, 4.14× latence

**npm version** : 1.2.1  
**Root cause** : `box_run` et `box_file` retournaient `logs: string[]` sans aucun cap de taille. Tout `console.log` dans la VM s'ajoutait à `logs` sans troncature — la totalité était sérialisée dans la réponse JSON. `box_read` retournait `content: string` (contenu brut du fichier) sans troncature non plus.

**Fix (PR #139)** :
- ✅ P0 — cap `logs` : 256 lignes max, `[... N more lines truncated]` sentinel.
- ✅ P0 — cap entrée log : 1KB par ligne, `[truncated]` suffix.
- ✅ P1 — cap `result` : 4KB max, `[truncated]` suffix.
- ✅ P1 — cap `content` (boxRead) : 16KB max, `[truncated after N bytes]` sentinel.

**State** : sandbox est stateless — chaque `boxRun`/`boxEval` crée un `vm.createContext` frais. Pas d'accumulation d'état inter-appels. VM isolation confirmée sûre (whitelist explicite, pas de `process`/`require`/`fs`/`global`).  
**Files** : `bricks/sandbox/src/operations.ts` (lines 94-172 boxRun, 197-251 boxEval, 292-307 boxRead)

---

## 🚨 Section 2 — Active P0 (à fixer urgent)

### `lastversion` — +392% tokens, +99% latence

**Signal** : plus grosse régression tokens (tokens ~5× native). 6 outils, seulement 1/6 utilisé.  
**Suspected** : outils retournent un output verbeux qui dump dans le contexte agent ; ou l'agent doit relire le manifest à répétition car les descriptions sont floues.  
**Status** : non investigué — root cause pas encore débuggée.

**Action** :
- Inspecter 1 run JSON — quel contenu le brick retourne-t-il par appel ?
- Revoir les descriptions d'outils — pourquoi l'agent ne choisit que 1/6 ?
- Vérifier si pagination/troncature manquante sur les outputs list-like.

**Priority** : 🚨

> **Note** : le tableau de sweep final (Section 8) affiche `lastversion` à +22% après correction — le chiffre +392% correspond au signal initial pré-correction. La root cause reste à investiguer.

---

## ⚠️ Section 3 — Active P1 (à investiguer/fixer après P0)

### `memory` — +22% tokens, +110% latence

**Signal** : brick stateful, cas similaire à `cache`.  
**Suspected** : bench iso-task single-agent ≠ use-case de memory. L'agent n'a pas de mémoire de session antérieure à rappeler.  
**Status** : non investigué — probablement un faux positif de méthodologie (voir Section 7).

**Action** :
- Exclure du bench single-task (brick stateful) OU concevoir un scénario Phase 2b qui s'étend sur plusieurs tâches.

**Priority** : 🔧 méthodologie

---

## 🔧 Section 4 — Active P2 (deferred / design changes)

### `planning` — +11% tokens, coverage 4/4

**Signal** : régression faible, mais **tous les 4 outils utilisés** — l'agent les a trouvés utiles mais a dépensé plus de tokens.  
**Suspected** : les outils de planning ajoutent une cérémonie ("décomposer la tâche en étapes") qui coûte plus qu'elle n'apporte sur une iso-task simple.  
**Action** : mesurer en Phase 2b scenario (multi-step raisonnement justifié). Meta-brick non mesurable en single-task.  
**Priority** : 🔧

---

### `parallel` — double round-trip run→collect

**Signal** : le pattern 2-steps force 2 MCP round-trips vs. un batch call unique.  
**Proposed fix** : effondrer run+collect en un seul `par_run` qui retourne les résultats inline, OU exposer `par_run` avec option `await=true`.  
**Status** : deferred — API change invasif. Le P0 payload cap (PR #138) a été livré. Ce P2 reste en backlog.  
**Priority** : 🔧

---

## 📝 Section 5 — CLI / UX issues (non-brick)

### ⚠️ No auto-install of brick dependencies

**Signal** : quand le `mcp-brick.json` d'un brick déclare `"dependencies": ["fileread", "symbol", ...]` (e.g. bundle bricks `codebase`, `aiteam`, `codemod`), `focus add <bundle>` ne cascade pas l'installation des deps. Au `focus start` l'utilisateur reçoit `error: Missing dependency "fileread"` et le serveur MCP s'arrête.

**Fix options** :
1. **Auto-install on add** : quand `focus add X` tourne, installer récursivement les deps listées dans `mcp-brick.json`. Logger ce qui est cascadé.
2. **Fail early on add** : refuser `focus add X` si les deps ne sont pas installées, avec suggestion `focus add X <dep-a> <dep-b>`.
3. **Fail clearer on start** : lister TOUTES les deps manquantes d'un coup (pas une par une) + suggérer la commande exacte `focus add ...`.

**Priority** : ⚠️ — friction utilisateur réelle confirmée en production.

---

### 🔧 Missing `focus upgrade` / `focus upgrade-all` command

**Signal** : pas de moyen pour les utilisateurs de mettre à jour les bricks installés sans `focus remove X && focus add X` manuellement.

**Fix** :
- `focus upgrade <name>` — réinstalle un brick unique à la dernière version du catalogue (remove + add en une commande, préserve l'état enabled et la config optionnelle).
- `focus upgrade --all` — idem pour chaque brick dans `center.json`.
- Optionnel : `focus self-upgrade` qui wrappe `npm install -g @focus-mcp/cli@latest`.

**Priority** : 🔧 — friction quotidienne, non bloquant au premier install.

---

### 🔧 `center.lock` schema incomplet (CLI 1.2.0)

**Observed** : le lockfile généré par `focus add/remove` manque des champs standardisés par les lockfiles npm-style : pas de `version` à la racine (schema versioning), pas de `resolved` par brick (URL absolue du tarball npm), pas de `integrity` (hash SHA).

**Current shape** :
```json
{
  "bricks": {
    "agent": { "version": "1.1.0", "catalogUrl": "...", "npmPackage": "@focus-mcp/brick-agent", "installedAt": "..." }
  }
}
```

**Target shape** (inspiré de package-lock.json) :
```json
{
  "lockfileVersion": 1,
  "bricks": {
    "agent": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@focus-mcp/brick-agent/-/brick-agent-1.1.0.tgz",
      "integrity": "sha512-...",
      "catalogUrl": "...",
      "npmPackage": "@focus-mcp/brick-agent",
      "installedAt": "..."
    }
  }
}
```

**Fix** : dans `parseLockEntry` / `writeCenterLock`, ajouter `lockfileVersion` optionnel à la racine (accepter les fichiers legacy sans lui) et peupler `resolved` + `integrity` après un `npm install` réussi.  
**Secondary note** : un `catalogUrl: "http://localhost:8642/catalog.json"` résiduel a été vu dans un `center.lock` utilisateur. Pas un bug de code, mais ajouter un warn à l'install si `catalogUrl` est `localhost` ou une IP privée.  
**Priority** : 🔧 — non-bloquant pour le flow install/load mais requis pour la reproductibilité. Ship en CLI 1.4.0 après le fix default-URL 1.3.0.

---

### ✅ `focus add` + `FilesystemBrickSource` layout mismatch — FIXED (PR focus-mcp/cli#38)

**Signal** : reproduit de façon autonome par Continue.dev (agent AI externe) lors d'un `focus add codebase` + `focus_load`. Layout observé : `~/.focus/bricks/` se termine avec `node_modules/@focus-mcp/brick-<name>/mcp-brick.json` (layout npm) alors que `FilesystemBrickSource.readManifest()` cherche `<bricksDir>/<name>/mcp-brick.json` → manifest jamais trouvé, `focus_load` échoue.

**Root cause** : `focus add <name>` lance `npm install @focus-mcp/brick-<name>` dans `~/.focus/bricks/`. npm stocke sous `node_modules/<scope>/<pkg>/`. Le resolver était écrit pour un layout plat.

**Fix** : `FilesystemBrickSource` utilise `require.resolve('@focus-mcp/brick-' + name + '/mcp-brick.json', { paths: [bricksDir] })`.  
**Impact bench** : aucun. Le harness copie le bon layout manuellement pour chaque run.

---

### 🔧 `filelist.fl_glob` — ne supporte pas les globs `**` récursifs

**Signal** : l'agent a appelé `fl_glob("**/*.decorator.ts")`, a obtenu empty, est tombé en fallback sur `fl_find` + filtre manuel.  
**Action** : supporter globstar (`**`) dans `fl_glob`. La plupart des librairies glob le supportent via une option.  
**File** : `bricks/filelist/src/glob.ts`  
**Priority** : 🔧

---

## 🗑️ Section 6 — Cleared (false positives confirmés)

### `graphexport` — +119% tokens, +74% latence

**Wave** : Wave 5.2  
**Verdict** : false positive. Les outputs sont proportionnels à la taille du graph (pas de bloat). Le delta venait du contexte ambiant Phase 2a verbeux, pas d'un bug de brick.

---

### `metrics` — +103% tokens, 6.06× latence

**Wave** : Wave 5.6a  
**Verdict** : false positive. `met_session` retourne un summary O(1), pas l'historique complet. Cleared.

---

### `share` — +51% tokens, 2.23× latence

**Wave** : Wave 4.1b  
**Verdict** : false positive. Pas de bug visible. `outputSizeUnder` posé en safety net. Cleared.

---

### `cache` — +38% tokens, +154% latence, coverage 0/5

**Wave** : Wave 4.1a  
**Verdict** : false positive. Map bornée + slice limité. Pas de bug visible. La coverage 0/5 est un artefact de méthodologie (brick stateful, non mesurable en single-task iso-task — voir Section 7).

---

### `heatmap` — +29% tokens

**Wave** : Wave 5.5  
**Verdict** : false positive. `hmHotfiles` slice à `limit=10`. Pas de bloat. Le delta venait de l'absence d'isolation (singleton entre runs). Cleared.

---

### `research` — +23% tokens, 3.49× latence

**Wave** : Wave 5.6a  
**Verdict** : false positive. Output borné strictement par source count. Pas de leak. La latence est inhérente à la nature multi-source (meta-brick — voir Section 7).

---

## 📊 Section 7 — Methodology issues

Bricks intrinsèquement mal mesurées par le bench iso-task (à exclure ou re-mesurer en Phase 2b scenario).

### Stateful bricks — single-task ne reflète pas leur use-case

`cache`, `memory`, `session`, `share`, `knowledge`, `knowledgebase` — le bench iso-task single-agent mesure leur overhead de démarrage mais pas leur valeur réelle (accumulation de contexte sur plusieurs tâches).

**Action** : flaguer dans le rapport comme "non mesurables en single-task iso-task". Mesurer en Phase 2b scenario (tâches qui s'étendent sur une session).

---

### Meta bricks — orchestrateurs non adaptés à la tâche unique

`planning`, `agent`, `dispatch`, `autopilot`, `aiteam` (bundle), `debate`, `thinking`, `research` — ajoutent une surcharge de raisonnement qui ne se rentabilise pas sur une iso-task simple.

**Action** : même traitement que stateful — Phase 2b scenario uniquement.

---

### Bench prompt design — couverture d'outils

L'agent concepteur de mini-task tend à choisir une tâche qui n'exerce qu'**un seul** outil du brick. La coverage est naturellement basse.

**Option** : ajouter à `BENCH_DESIGN_AND_SOLVE.md` : "Préférer une tâche qui exercerait naturellement 2-3 outils du brick, sans forcer la contrivance."  
**Trade-off** : plus de coverage = meilleur diagnostic, mais tâches plus longues = plus de tokens par run.  
**Decision** : différé jusqu'à analyse du premier sweep complet. Si beaucoup de bricks montrent coverage < 30% ET delta négatif, considérer le patch pour un second passage.

---

### Category C bricks — task-design flaw (pas des bugs brick)

`callgraph` +18%, `depgraph` +51%, `treesitter` +66% — iso-task générée par l'agent natif était solvable par grep/read trivial. Pas des bugs brick ; le bench a choisi une tâche trop facile pour leur force.

**Action** : redesigner les iso-tasks pour forcer l'analyse structurelle que grep ne peut pas faire :
- `callgraph` : "Find all callee chains of depth ≥ 3 starting from `Module.onModuleInit`" (grep ne peut pas traverser).
- `depgraph` : "Compute reverse-dependency closure for `@nestjs/common/cache` across all packages" (grep ne fait pas de closure).
- `treesitter` : "Count all `async` arrow functions nested inside class methods" (grep a des faux positifs lourds).

Ne PAS augmenter maxTurns davantage (60, 80...). Le problème est le design de tâche, pas le budget de tours.

---

## 📊 Section 8 — Full sweep summary (62 bricks, 81 min wall clock, 51.4M tokens)

- ✅ **54 OK** — delta mesuré
- 🔴 **8 FAILED** — native hit max-turns (20), retry aussi échoué

### Distribution (54 OK)

- **25 bricks excellent** (≥60% savings)
- **15 bricks moderate** (20-60% savings)
- **14 bricks regressing** (brick pire que native sur tokens, latency, ou les deux)

### 14 regressions — toutes analysées

| Brick | Δ tokens | Duration ratio | Coverage | Status |
|---|---:|---:|---|---|
| `fileops` | +379% | 5.82× | 1/4 | ✅ FIXED 1.3.0 |
| `graphexport` | +119% | 1.74× | 1/6 | 🗑️ Cleared (false positive) |
| `metrics` | +103% | **6.06×** | 2/4 | 🗑️ Cleared (false positive) |
| `parallel` | +79% | **9.74×** | 3/4 | ✅ FIXED 1.1.1 (P2 run→collect deferred) |
| `share` | +51% | 2.23× | 3/4 | 🗑️ Cleared (false positive) |
| `sandbox` | +42% | 4.14× | 3/4 | ✅ FIXED 1.2.1 |
| `cache` | +38% | 1.90× | **0/5** | 🗑️ Cleared (methodology — stateful) |
| `heatmap` | +29% | 0.84× | 2/4 | 🗑️ Cleared (false positive) |
| `research` | +23% | 3.49× | 3/3 | 🗑️ Cleared (methodology — meta brick) |
| `lastversion` | +392% | +99% lat | 1/6 | 🚨 P0 — non investigué |
| `planning` | +11% | 1.20× | 4/4 | 🔧 P2 — meta brick, deferred |
| `memory` | +11% | 1.03× | 2/5 | ⚠️ P1 — stateful, methodology probable |

### 8 FAILED bricks — résultats après re-run maxTurns=40 (16 min, 15M tokens)

Re-run confirmé : avec plus de tours, le natif **termine toujours**. L'angle marketing "brick-only viable" ne tient pas en iso-task.

**5 wins (Category A)** :
- `graphquery` **–67%**
- `validate` **–65%**
- `review` –40%
- `routes` –20%
- `symbol` –4% (marginal)

**0 Category B** — aucun run natif vraiment impossible avec Claude Sonnet 4.6 à 40 tours.

**3 regressions (Category C — task-design flaw)** : `callgraph` +18%, `depgraph` +51%, `treesitter` +66%. Voir Section 7 pour les redesigns de tâches.

### Top 10 wins (validés)

| Brick | Δ tokens | Duration ratio |
|---|---:|---:|
| `rename` | –84% | 0.55× |
| `contextpack` | –83% | 0.38× |
| `fullaudit` | –83% | 0.25× |
| `savings` | –82% | 0.22× |
| `filesearch` | –82% | 0.57× |
| `impact` | –81% | 0.40× |
| `filediff` | –81% | 0.31× |
| `decision` | –80% | 0.41× |
| `fts` | –80% | 0.56× |
| `refs` | –79% | 0.47× |

**Note** : les top winners sont aussi **plus rapides** (ratio < 1×). Contredit l'inquiétude initiale que le mode brick serait plus lent.

### Manifest / description improvements (low priority)

Bricks où l'agent choisit mal parmi les outils ou en ignore certains — descriptions peu claires.
Candidats identifiés du sweep (coverage < 50% ET delta < –30% — encore de la marge d'amélioration) :

- `fullaudit` : 0/2 used, –88% tokens.
- `onboarding` : 0/2 used, –77% tokens.
- `autopilot` : 0/3 used, –58%.
- `outline` : 1/3 used, –80%.
- `impact` : 1/3 used, –84%.
- `refs` : 1/4, –80%.
- `rename` : 1/4, –84%.
- `contextpack` : 1/4, –85%.

**Action template** : pour chacun, revoir les descriptions pour assurer la différenciation. Quand un outil couvre le cas commun et les autres sont edge-case, c'est OK. Quand l'agent rate simplement les outils siblings, les descriptions ont besoin de trigger-words.  
**Priority** : 📝 (après les régressions fixées)

---

### Pending (sweep partiel)

`callgraph`, `depgraph`, `fts` — résultats en attente (probables retries dûs à max-turns).  
`graphcluster`, `graphquery` — fiches présentes mais données partielles visibles.

Re-audit après complétion du sweep.
