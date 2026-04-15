# Changesets

Ce dossier contient les changesets de la marketplace FocusMCP. Chaque PR introduisant un changement sur une brique doit ajouter un changeset via `pnpm changeset`.

- Mode : **independent** (pas de `fixed`, pas de `linked`) — chaque brique a sa propre version et ses propres tags `focus-<name>@x.y.z`.
- Pas de publication npm (MVP) : `access: restricted` et `privatePackages.version/tag: true`. La distribution se fait via GitHub Releases (tarballs) et `catalog.json`.
- `baseBranch: develop` — les changesets sont ouverts sur develop, promus vers main à la release.

Format : Markdown avec frontmatter listant les briques affectées et le bump (patch/minor/major).

Référence : https://github.com/changesets/changesets
