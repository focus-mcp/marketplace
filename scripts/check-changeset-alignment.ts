// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * check-changeset-alignment — verifies that every brick modified in a PR
 * has a corresponding entry in at least one changeset markdown file.
 *
 * Usage (CI):
 *   BASE_SHA=<base> HEAD_SHA=<head> tsx scripts/check-changeset-alignment.ts
 *
 * Exits 0 if all modified bricks are covered (or bypass keyword is present).
 * Exits 1 and prints a diagnostic if any brick is missing from changesets.
 *
 * Bypass: any file matching .changeset/cross-cutting-*.md in the diff skips
 * the check entirely (for rare cross-cutting infra PRs).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function gitDiffNames(base: string, head: string): string[] {
    try {
        const out = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
            cwd: ROOT,
            encoding: 'utf-8',
        }).trim();
        return out ? out.split('\n') : [];
    } catch {
        const out = execFileSync('git', ['diff', '--name-only', 'origin/develop...HEAD'], {
            cwd: ROOT,
            encoding: 'utf-8',
        }).trim();
        return out ? out.split('\n') : [];
    }
}

function getChangedFiles(): string[] {
    const base = process.env['BASE_SHA'] ?? 'origin/develop';
    const head = process.env['HEAD_SHA'] ?? 'HEAD';
    return gitDiffNames(base, head);
}

function getChangedBricks(files: string[]): Set<string> {
    const bricks = new Set<string>();
    for (const f of files) {
        const m = f.match(/^bricks\/([^/]+)\//);
        if (m?.[1]) bricks.add(m[1]);
    }
    return bricks;
}

function hasCrossCuttingBypass(files: string[]): boolean {
    return files.some((f) => /^\.changeset\/cross-cutting-.+\.md$/.test(f));
}

function parseCoveredBricks(content: string, covered: Set<string>): void {
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fm?.[1]) return;
    for (const line of fm[1].split('\n')) {
        const m = line.match(/^"@focus-mcp\/brick-([^"]+)":/);
        if (m?.[1]) covered.add(m[1]);
    }
}

function getChangesetCoveredBricks(files: string[]): Set<string> {
    const covered = new Set<string>();
    const changesetDir = join(ROOT, '.changeset');

    const prChangesets = files
        .filter((f) => /^\.changeset\/.+\.md$/.test(f) && f !== '.changeset/README.md')
        .map((f) => join(ROOT, f))
        .filter((f) => existsSync(f));

    if (prChangesets.length > 0) {
        for (const path of prChangesets) {
            parseCoveredBricks(readFileSync(path, 'utf-8'), covered);
        }
    } else if (existsSync(changesetDir)) {
        // Fall back to all existing changesets (amended changeset case)
        for (const name of readdirSync(changesetDir)) {
            if (!name.endsWith('.md') || name === 'README.md') continue;
            parseCoveredBricks(readFileSync(join(changesetDir, name), 'utf-8'), covered);
        }
    }

    return covered;
}

function main(): void {
    const changedFiles = getChangedFiles();

    if (hasCrossCuttingBypass(changedFiles)) {
        console.log('Cross-cutting changeset detected — skipping alignment check.');
        process.exit(0);
    }

    const changedBricks = getChangedBricks(changedFiles);

    if (changedBricks.size === 0) {
        console.log('No bricks modified — nothing to check.');
        process.exit(0);
    }

    const coveredBricks = getChangesetCoveredBricks(changedFiles);
    const missing = [...changedBricks].filter((b) => !coveredBricks.has(b));

    if (missing.length === 0) {
        console.log(`Changeset alignment OK — ${changedBricks.size} brick(s) covered.`);
        process.exit(0);
    }

    console.error('Changeset alignment FAILED.');
    console.error('');
    console.error('The following bricks were modified but have no changeset entry:');
    for (const b of missing) {
        console.error(`  - @focus-mcp/brick-${b}  (bricks/${b}/)`);
    }
    console.error('');
    console.error('Add a changeset with:');
    console.error('  pnpm changeset');
    console.error('or create .changeset/<slug>.md manually (see CONTRIBUTING.md).');
    console.error('');
    console.error('For cross-cutting infra PRs, add a .changeset/cross-cutting-<slug>.md');
    console.error('file and include "Cross-cutting: <reason>" in the PR description.');
    process.exit(1);
}

main();
