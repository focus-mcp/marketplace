/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Framework = 'nestjs' | 'symfony' | 'django' | 'fastapi' | 'nextjs';

function repoRoot(): string {
    // Walk up from import.meta.url until we find pnpm-workspace.yaml.
    // Simplified: assume process.cwd() is within the repo during tests.
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
        if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
        dir = resolve(dir, '..');
    }
    throw new Error('Cannot locate repo root (pnpm-workspace.yaml)');
}

/**
 * Absolute path to a real-framework fixture (git submodule under /fixtures).
 * Throws with an actionable hint if the submodule has not been initialized.
 */
export function getRealFixture(framework: Framework): string {
    const path = resolve(repoRoot(), 'fixtures', framework);
    if (!existsSync(path)) {
        throw new Error(
            `Real fixture "${framework}" not found at ${path}. ` +
                `Did you run scripts/bootstrap.sh? Submodule missing.`,
        );
    }
    return path;
}

/**
 * Absolute path to a brick's synthetic fixture (committed file under the brick's tests dir).
 */
export function getSyntheticFixture(packageName: string, relativePath: string): string {
    return resolve(
        repoRoot(),
        packageName === 'marketplace-testing'
            ? 'packages/marketplace-testing'
            : `bricks/${packageName}`,
        'tests/integration/fixtures/synthetic',
        relativePath,
    );
}
