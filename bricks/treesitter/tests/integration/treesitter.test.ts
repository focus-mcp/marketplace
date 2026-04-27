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
import { indexStore } from '../../src/operations.js';
import { check as checkTsCleanupHappy } from './scenarios/ts_cleanup/happy/invariants.js';
import { check as checkTsIndexHappy } from './scenarios/ts_index/happy/invariants.js';
import { check as checkTsLangsHappy } from './scenarios/ts_langs/happy/invariants.js';
import { check as checkTsReindexHappy } from './scenarios/ts_reindex/happy/invariants.js';
import { check as checkTsStatusHappy } from './scenarios/ts_status/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-treesitter-integ-'));
    indexStore.clear();
});

afterEach(async () => {
    indexStore.clear();
    await rm(testDir, { recursive: true, force: true });
});

// ─── ts_index ─────────────────────────────────────────────────────────────────

describe('ts_index integration', () => {
    it('happy: index dir with 2-function TS file → files=1, symbols >= 2, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'mod.ts'),
            ['export function alpha(): void {}', 'export function beta(): void {}'].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        for (const inv of checkTsIndexHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_status ────────────────────────────────────────────────────────────────

describe('ts_status integration', () => {
    it('happy: status after indexing 1 file → files=1, symbols >= 2, langs non-empty, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'mod.ts'),
            ['export function alpha(): void {}', 'export function beta(): void {}'].join('\n'),
        );
        await runTool(brick, 'index', { dir: testDir });
        const output = await runTool(brick, 'status', {});
        for (const inv of checkTsStatusHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_reindex ───────────────────────────────────────────────────────────────

describe('ts_reindex integration', () => {
    it('happy: reindex a single file with 1 exported function → symbols >= 1, size<=2048B', async () => {
        const filePath = join(testDir, 'single.ts');
        await writeFile(filePath, 'export function hello(): void {}');
        const output = await runTool(brick, 'reindex', { path: filePath });
        for (const inv of checkTsReindexHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_cleanup ───────────────────────────────────────────────────────────────

describe('ts_cleanup integration', () => {
    it('happy: cleanup after indexing 1 file → removed >= 1, size<=1024B', async () => {
        await writeFile(join(testDir, 'mod.ts'), 'export function alpha(): void {}');
        await runTool(brick, 'index', { dir: testDir });
        const output = await runTool(brick, 'cleanup', {});
        for (const inv of checkTsCleanupHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_langs ─────────────────────────────────────────────────────────────────

describe('ts_langs integration', () => {
    it('happy: langs() → array with typescript+javascript+yaml, size<=1024B', async () => {
        const output = await runTool(brick, 'langs', {});
        for (const inv of checkTsLangsHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── YAML indexing ────────────────────────────────────────────────────────────

describe('ts_index YAML integration', () => {
    it('happy: index a YAML k8s manifest → extracts top-level keys as symbols', async () => {
        await writeFile(
            join(testDir, 'deployment.yaml'),
            [
                'apiVersion: apps/v1',
                'kind: Deployment',
                'metadata:',
                '  name: my-app',
                'spec:',
                '  replicas: 3',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 4)
            throw new Error(
                `expected symbols>=4 (apiVersion, kind, metadata, spec), got ${String(o.symbols)}`,
            );
    });
});
