#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 FocusMCP contributors
# SPDX-License-Identifier: MIT
set -euo pipefail

# One-shot setup for local dev: fetch submodules, install workspace deps.
# fixtures/nestjs pinned to SHA: 8eec029772fa979aa51e782aeb668b8522efd6d5

echo "→ Initializing git submodules (shallow)..."
git submodule update --init --recursive --depth 1

echo "→ Installing pnpm workspace dependencies..."
pnpm install --frozen-lockfile

echo "→ Building marketplace-testing helpers..."
pnpm --filter @focus-mcp/marketplace-testing run build 2>/dev/null || true

echo "✓ Bootstrap done. You can now run: pnpm -r run test:integration"
