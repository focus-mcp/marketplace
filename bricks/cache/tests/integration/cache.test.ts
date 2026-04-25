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
import { _resetCacheStore } from '../../src/operations.js';
import { check as checkCacheGetCacheMissFromFs } from './scenarios/cache_get/cache-miss-from-fs/invariants.js';
import { check as checkCacheGetCacheHit } from './scenarios/cache_get/happy-cache-hit/invariants.js';
import { check as checkCacheGetPathNotFound } from './scenarios/cache_get/path-not-found/invariants.js';
import { check as checkCacheInvalidateHappy } from './scenarios/cache_invalidate/happy/invariants.js';
import { check as checkCacheSetHappy } from './scenarios/cache_set/happy/invariants.js';
import { check as checkCacheStatsHappy } from './scenarios/cache_stats/happy/invariants.js';
import { check as checkCacheWarmupHappy } from './scenarios/cache_warmup/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-cache-inttest-'));
    _resetCacheStore();
});

afterEach(async () => {
    _resetCacheStore();
    await rm(testDir, { recursive: true, force: true });
});

// ─── cache_set ────────────────────────────────────────────────────────────────

describe('cache_set integration', () => {
    it('happy: set a key+content returns ok=true', async () => {
        const filePath = join(testDir, 'test.txt');
        const output = await runTool(brick, 'set', { path: filePath, content: 'hello world' });
        for (const i of checkCacheSetHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── cache_get ────────────────────────────────────────────────────────────────

describe('cache_get integration', () => {
    it('happy-cache-hit: set then get returns hit=true from store', async () => {
        const filePath = join(testDir, 'cached.txt');
        await runTool(brick, 'set', { path: filePath, content: 'cached content' });
        const output = await runTool(brick, 'get', { path: filePath });
        for (const i of checkCacheGetCacheHit(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('cache-miss-from-fs: get on path not in cache reads from FS and populates cache', async () => {
        const filePath = join(testDir, 'fs-file.txt');
        await writeFile(filePath, 'from filesystem');
        const output = await runTool(brick, 'get', { path: filePath });
        for (const i of checkCacheGetCacheMissFromFs(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('path-not-found: get on non-existent path throws clear error', async () => {
        const nonExistentPath = join(testDir, 'does-not-exist.txt');
        let caughtError: unknown;
        try {
            await runTool(brick, 'get', { path: nonExistentPath });
        } catch (err) {
            caughtError = err;
        }
        const output = { error: caughtError };
        for (const i of checkCacheGetPathNotFound(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── cache_invalidate ─────────────────────────────────────────────────────────

describe('cache_invalidate integration', () => {
    it('happy: set, invalidate, get → cache miss (re-read from FS)', async () => {
        const filePath = join(testDir, 'invalidate-me.txt');
        await writeFile(filePath, 'original');
        await runTool(brick, 'set', { path: filePath, content: 'forced content' });
        await runTool(brick, 'invalidate', { path: filePath });
        const output = await runTool(brick, 'get', { path: filePath });
        for (const i of checkCacheInvalidateHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── cache_warmup ─────────────────────────────────────────────────────────────

describe('cache_warmup integration', () => {
    it('happy: warmup with list, verify all in cache via stats', async () => {
        const f1 = join(testDir, 'w1.txt');
        const f2 = join(testDir, 'w2.txt');
        const f3 = join(testDir, 'w3.txt');
        await writeFile(f1, 'content1');
        await writeFile(f2, 'content2');
        await writeFile(f3, 'content3');
        const warmupOutput = await runTool(brick, 'warmup', { paths: [f1, f2, f3] });
        const statsOutput = await runTool(brick, 'stats', {});
        for (const i of checkCacheWarmupHappy(warmupOutput, statsOutput)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── cache_stats ──────────────────────────────────────────────────────────────

describe('cache_stats integration', () => {
    it('happy: initial stats — hits=0, misses=0, entries=0', async () => {
        const output = await runTool(brick, 'stats', {});
        for (const i of checkCacheStatsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
