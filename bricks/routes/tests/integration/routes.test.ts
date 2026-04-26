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
import { check as checkRtFrameworksHappy } from './scenarios/rt_frameworks/happy/invariants.js';
import { check as checkRtListHappy } from './scenarios/rt_list/happy/invariants.js';
import { check as checkRtScanHappy } from './scenarios/rt_scan/happy/invariants.js';
import { check as checkRtSearchHappy } from './scenarios/rt_search/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-routes-integ-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── rt_scan ──────────────────────────────────────────────────────────────────

describe('rt_scan integration', () => {
    it('happy: Express dir with GET+POST → total=2, framework=express, size<=4096B', async () => {
        await writeFile(
            join(testDir, 'routes.ts'),
            [
                "app.get('/users', (req, res) => res.json([]));",
                "app.post('/users', (req, res) => res.sendStatus(201));",
            ].join('\n'),
        );
        const output = await runTool(brick, 'scan', { dir: testDir, framework: 'express' });
        for (const inv of checkRtScanHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── rt_search ────────────────────────────────────────────────────────────────

describe('rt_search integration', () => {
    it('happy: search("/users") → total=2, all paths contain /users, size<=4096B', async () => {
        await writeFile(
            join(testDir, 'api.ts'),
            [
                "app.get('/users', () => {});",
                "app.post('/users', () => {});",
                "app.get('/posts', () => {});",
            ].join('\n'),
        );
        const output = await runTool(brick, 'search', { dir: testDir, pattern: '/users' });
        for (const inv of checkRtSearchHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── rt_list ──────────────────────────────────────────────────────────────────

describe('rt_list integration', () => {
    it('happy: list all routes → total=2, table has METHOD+PATH headers, size<=4096B', async () => {
        await writeFile(
            join(testDir, 'server.ts'),
            ["app.get('/health', () => {});", "app.post('/data', () => {});"].join('\n'),
        );
        const output = await runTool(brick, 'list', { dir: testDir });
        for (const inv of checkRtListHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── rt_frameworks ────────────────────────────────────────────────────────────

describe('rt_frameworks integration', () => {
    it('happy: package.json with express dep → frameworks has express entry, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({ dependencies: { express: '^4.18.0' } }),
        );
        const output = await runTool(brick, 'frameworks', { dir: testDir });
        for (const inv of checkRtFrameworksHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
