/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { _setReposFile } from '../../src/operations.js';
import { check as checkReposListHappy } from './scenarios/repos_list/happy/invariants.js';
import { check as checkReposRegisterHappy } from './scenarios/repos_register/happy/invariants.js';
import { check as checkReposStatsHappy } from './scenarios/repos_stats/happy/invariants.js';
import { check as checkReposUnregisterHappy } from './scenarios/repos_unregister/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

let testDir: string;
let reposFile: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-repos-int-'));
    reposFile = join(testDir, 'repos.json');
    _setReposFile(reposFile);
});

afterEach(async () => {
    _setReposFile(undefined);
    await rm(testDir, { recursive: true, force: true });
});

// ─── repos_register/happy ────────────────────────────────────────────────────

describe('repos_register/happy integration', () => {
    it('register name+path → ok=true', async () => {
        const output = await runTool(brick, 'register', { name: 'my-repo', path: testDir });
        assertInvariants(checkReposRegisterHappy(output));
    });
});

// ─── repos_list/happy ────────────────────────────────────────────────────────

describe('repos_list/happy integration', () => {
    it('sequenced: 3× register + list → repos.length=3', async () => {
        await runTool(brick, 'register', { name: 'repo-a', path: testDir });
        await runTool(brick, 'register', { name: 'repo-b', path: testDir });
        await runTool(brick, 'register', { name: 'repo-c', path: testDir });
        const output = await runTool(brick, 'list', {});
        assertInvariants(checkReposListHappy(output, 3));
    });
});

// ─── repos_unregister/happy ──────────────────────────────────────────────────

describe('repos_unregister/happy integration', () => {
    it('sequenced: register + unregister + list (empty)', async () => {
        await runTool(brick, 'register', { name: 'to-remove', path: testDir });
        const unregOut = await runTool(brick, 'unregister', { name: 'to-remove' });
        assertInvariants(checkReposUnregisterHappy(unregOut));

        const listOut = await runTool(brick, 'list', {});
        assertInvariants(checkReposListHappy(listOut, 0));
    });
});

// ─── repos_stats/happy ───────────────────────────────────────────────────────

describe('repos_stats/happy integration', () => {
    it('sequenced: register + stats → files=2, lines>0, languages has .ts/.js', async () => {
        const repoDir = join(testDir, 'stats-repo');
        await mkdir(repoDir);
        await writeFile(join(repoDir, 'a.ts'), 'export const x = 1;\nconst y = 2;\n');
        await writeFile(join(repoDir, 'b.js'), 'console.log("hi");\n');

        await runTool(brick, 'register', { name: 'stats-repo', path: repoDir });
        const output = await runTool(brick, 'stats', { name: 'stats-repo' });
        assertInvariants(checkReposStatsHappy(output, 2, repoDir));
    });
});
