/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetGraph } from '../../src/operations.js';
import { check as checkGbAddHappy } from './scenarios/gb_add/happy/invariants.js';
import { check as checkGbBuildHappy } from './scenarios/gb_build/happy/invariants.js';
import { check as checkGbMultimodalHappy } from './scenarios/gb_multimodal/happy/invariants.js';
import { check as checkGbUpdateHappy } from './scenarios/gb_update/happy/invariants.js';

let testDir: string;

function assertInvariants(results: { ok: boolean; reason?: string }[]): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason}`);
    }
}

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-gb-integ-'));
    resetGraph();
});

afterEach(async () => {
    resetGraph();
    await rm(testDir, { recursive: true, force: true });
});

// ─── gb_build ─────────────────────────────────────────────────────────────────

describe('gb_build integration', () => {
    it('happy: build(sandbox/3 TS files) → nodeCount>0, edgeCount>=0, files=3', async () => {
        await writeFile(join(testDir, 'a.ts'), `export const alpha = 1;\n`);
        await writeFile(join(testDir, 'b.ts'), `export function beta(): void {}\n`);
        await writeFile(
            join(testDir, 'c.ts'),
            `import { alpha } from './a';\nexport const gamma = alpha;\n`,
        );
        const output = await runTool(brick, 'build', { dir: testDir });
        assertInvariants(checkGbBuildHappy(output, 3));
    });
});

// ─── gb_update ────────────────────────────────────────────────────────────────

describe('gb_update integration', () => {
    it('happy: build + update modified file → updated=1, nodeCount>=nodeCountBefore', async () => {
        const mainPath = join(testDir, 'main.ts');
        await writeFile(join(testDir, 'util.ts'), `export const helper = true;\n`);
        await writeFile(mainPath, `export const run = 1;\n`);

        const buildOutput = await runTool(brick, 'build', { dir: testDir });
        const nodeCountBefore = (buildOutput as { nodeCount: number }).nodeCount;

        // Add an export to main.ts to produce more nodes on re-scan
        await writeFile(mainPath, `export const run = 1;\nexport function extra(): void {}\n`);
        const updateOutput = await runTool(brick, 'update', { files: [mainPath] });

        assertInvariants(checkGbUpdateHappy(updateOutput, nodeCountBefore));
    });
});

// ─── gb_add ───────────────────────────────────────────────────────────────────

describe('gb_add integration', () => {
    it('happy: add node manually → added=node, id matches', async () => {
        const output = await runTool(brick, 'add', {
            node: { id: 'manual-node-1', type: 'file', label: 'ManualNode' },
        });
        assertInvariants(checkGbAddHappy(output, 'manual-node-1'));
    });
});

// ─── gb_multimodal ────────────────────────────────────────────────────────────

describe('gb_multimodal integration', () => {
    it('happy: build + multimodal(full) → format=full, nodes non-empty, edges array', async () => {
        await writeFile(join(testDir, 'x.ts'), `export const x = 42;\n`);
        await writeFile(join(testDir, 'y.ts'), `import { x } from './x';\nexport const y = x;\n`);
        await runTool(brick, 'build', { dir: testDir });
        const output = await runTool(brick, 'multimodal', { format: 'full' });
        assertInvariants(checkGbMultimodalHappy(output));
    });
});
