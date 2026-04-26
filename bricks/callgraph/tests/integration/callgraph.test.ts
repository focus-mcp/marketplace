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
import { check as checkCgCalleesHappy } from './scenarios/cg_callees/happy/invariants.js';
import { check as checkCgCallersHappy } from './scenarios/cg_callers/happy/invariants.js';
import { check as checkCgChainHappy } from './scenarios/cg_chain/happy/invariants.js';
import { check as checkCgDepthHappy } from './scenarios/cg_depth/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-callgraph-integ-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── cg_callers ───────────────────────────────────────────────────────────────

describe('cg_callers integration', () => {
    it('happy: find callers of doWork in dir → at least 1 caller, fields present, size<=4096B', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            [
                'export function doWork(): void {}',
                'export function main(): void {',
                '    doWork();',
                '}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'callers', { name: 'doWork', dir: testDir });
        for (const inv of checkCgCallersHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── cg_callees ───────────────────────────────────────────────────────────────

describe('cg_callees integration', () => {
    it('happy: find callees of main in file → helper + doWork in callees, size<=4096B', async () => {
        const filePath = join(testDir, 'b.ts');
        await writeFile(
            filePath,
            ['export function main(): void {', '    doWork();', '    helper();', '}'].join('\n'),
        );
        const output = await runTool(brick, 'callees', {
            name: 'main',
            file: filePath,
            startLine: 1,
            endLine: 4,
        });
        for (const inv of checkCgCalleesHappy(output, ['doWork', 'helper'])) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── cg_chain ─────────────────────────────────────────────────────────────────

describe('cg_chain integration', () => {
    it('happy: chain from a to c via b → non-null chain [a, b, c], size<=4096B', async () => {
        await writeFile(
            join(testDir, 'c.ts'),
            [
                'export function a(): void { b(); }',
                'export function b(): void { c(); }',
                'export function c(): void {}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'chain', { from: 'a', to: 'c', dir: testDir });
        for (const inv of checkCgChainHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── cg_depth ─────────────────────────────────────────────────────────────────

describe('cg_depth integration', () => {
    it('happy: depth of top in 3-level chain → depth >= 2, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'd.ts'),
            [
                'export function top(): void { middle(); }',
                'export function middle(): void { bottom(); }',
                'export function bottom(): void {}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'depth', { name: 'top', dir: testDir });
        for (const inv of checkCgDepthHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
