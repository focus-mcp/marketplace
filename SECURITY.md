<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->

# Politique de sécurité

## Versions supportées

La marketplace et ses briques sont en pré-MVP (`0.x`). Aucune brique n'est encore considérée comme stable. Chaque brique suit **sa propre version** (semver, mode Changesets independent).

## Reporter une vulnérabilité

**Ne pas ouvrir d'issue publique** pour une vulnérabilité de sécurité (sur une brique, sur le générateur de catalogue, ou sur le schéma).

Envoyer un rapport privé via :

- **[GitHub Security Advisories](https://github.com/focus-mcp/marketplace/security/advisories/new)** (recommandé)
- ou par email : security@focusmcp.dev

Inclure si possible :

- Brique concernée (ou tooling)
- Description du problème
- Étapes de reproduction
- Impact estimé
- Suggestions de mitigation

## Engagement

Nous nous engageons à :

- **Accuser réception** sous 72h
- **Évaluer** et **prioriser** la vulnérabilité sous 7 jours
- **Coordonner** la divulgation responsable
- **Créditer** le découvreur (sauf demande contraire)

## Périmètre

Ce dépôt étant un **catalogue** (et non un runtime), les surfaces d'attaque principales sont :

1. **Le catalogue `catalog.json`** publié sur GitHub Pages — intégrité du JSON, cohérence des `integrity`/`sha` associés aux tarballs.
2. **Le JSON Schema `schemas/catalog/v1.json`** — une régression de schéma peut permettre des entrées malveillantes.
3. **Les briques elles-mêmes** — une brique malveillante ou compromise peut affecter les utilisateurs de FocusMCP.
4. **Le pipeline CI** — secret scanning, permissions minimales sur les workflows.

Les vulnérabilités affectant l'une de ces surfaces sont prioritaires.

## Pratiques de sécurité du projet

- Secret scanning (gitleaks) en pre-commit + CI
- Dependency scanning (Renovate + `pnpm audit`)
- SAST (CodeQL) en CI
- REUSE compliance (licences explicites)
- Validation stricte du catalogue contre le JSON Schema à chaque build
- Commits signés (GPG/SSH) recommandés pour les mainteneurs
