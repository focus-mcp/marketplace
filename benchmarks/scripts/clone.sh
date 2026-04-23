#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 FocusMCP contributors
# SPDX-License-Identifier: MIT
#
# clone.sh — Shallow-clone each benchmark repo into .cache/repos/<repo-id>/
#             and symlink into each case directory (once per task × repo triple).
#
# Usage: bash benchmarks/scripts/clone.sh
# Run from the marketplace root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARKS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_JSON="$BENCHMARKS_DIR/repos.json"
CACHE_DIR="$BENCHMARKS_DIR/.cache/repos"
CASES_DIR="$BENCHMARKS_DIR/cases"

TASKS=("read-understand" "search-usages" "edit-refactor")

if [[ ! -f "$REPOS_JSON" ]]; then
    echo "ERROR: repos.json not found at $REPOS_JSON" >&2
    exit 1
fi

# Parse repos.json with node (always available in this project)
REPO_COUNT=$(node -e "const r=JSON.parse(require('fs').readFileSync('$REPOS_JSON','utf8'));console.log(r.length)")
echo "Found $REPO_COUNT repos to process."

mkdir -p "$CACHE_DIR"

# Build clone jobs: "<id> <url> <ref>"
mapfile -t CLONE_JOBS < <(node -e "
const repos = JSON.parse(require('fs').readFileSync('$REPOS_JSON','utf8'));
for (const r of repos) {
    process.stdout.write(r.id + ' ' + r.url + ' ' + r.ref + '\n');
}
")

clone_repo() {
    local id="$1"
    local url="$2"
    local ref="$3"
    local dest="$CACHE_DIR/$id"

    if [[ -d "$dest" ]]; then
        echo "[SKIP]  $id — already cloned at $dest"
        return 0
    fi

    echo "[CLONE] $id ($ref) from $url"
    if git clone --depth=1 --single-branch --branch "$ref" "$url" "$dest" 2>&1 | tail -1; then
        echo "[OK]    $id cloned successfully"
    else
        echo "[FAIL]  $id — clone failed" >&2
        return 1
    fi
}

export -f clone_repo
export CACHE_DIR

# Parallel clone (up to 4 simultaneous)
printf '%s\n' "${CLONE_JOBS[@]}" | xargs -P 4 -I '{}' bash -c '
    args=($@)
    clone_repo "${args[0]}" "${args[1]}" "${args[2]}"
' _ {}

echo ""
echo "Creating symlinks into case directories..."

# Create symlinks: cases/<task>/<repo-id>/repo -> ../../../.cache/repos/<repo-id>
for task in "${TASKS[@]}"; do
    for job in "${CLONE_JOBS[@]}"; do
        id=$(echo "$job" | awk '{print $1}')
        link_path="$CASES_DIR/$task/$id/repo"
        target="$CACHE_DIR/$id"

        if [[ -L "$link_path" ]]; then
            echo "[SKIP]  symlink $task/$id/repo already exists"
        elif [[ -d "$link_path" ]]; then
            echo "[WARN]  $link_path is a real directory, not symlinking"
        else
            mkdir -p "$CASES_DIR/$task/$id"
            ln -s "$target" "$link_path"
            echo "[LINK]  $task/$id/repo -> $target"
        fi
    done
done

echo ""
echo "Done. Repos cached in $CACHE_DIR"
echo "Symlinks created under $CASES_DIR/<task>/<repo>/repo"
