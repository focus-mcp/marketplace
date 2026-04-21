// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _resetCacheStore,
    cacheGet,
    cacheInvalidate,
    cacheSet,
    cacheStats,
    cacheWarmup,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-cache-test-'));
    _resetCacheStore();
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    _resetCacheStore();
});

describe('cacheGet', () => {
    it('returns miss on first read', async () => {
        const file = join(testDir, 'a.txt');
        await writeFile(file, 'hello');
        const result = await cacheGet({ path: file });
        expect(result.hit).toBe(false);
        expect(result.content).toBe('hello');
    });

    it('returns hit on second read of same file', async () => {
        const file = join(testDir, 'b.txt');
        await writeFile(file, 'world');
        await cacheGet({ path: file });
        const result = await cacheGet({ path: file });
        expect(result.hit).toBe(true);
        expect(result.content).toBe('world');
    });

    it('returns miss after file mtime changes', async () => {
        const file = join(testDir, 'c.txt');
        await writeFile(file, 'v1');
        await cacheGet({ path: file });

        // Update the file content and mtime
        await writeFile(file, 'v2');
        // Force different mtime by using utimes
        const future = new Date(Date.now() + 5000);
        await utimes(file, future, future);

        const result = await cacheGet({ path: file });
        expect(result.hit).toBe(false);
        expect(result.content).toBe('v2');
    });

    it('throws on non-existent file', async () => {
        await expect(cacheGet({ path: join(testDir, 'nope.txt') })).rejects.toThrow();
    });
});

describe('cacheSet', () => {
    it('forces content into cache', async () => {
        const file = join(testDir, 'd.txt');
        await writeFile(file, 'original');
        cacheSet({ path: file, content: 'forced' });
        // The cached content should now be 'forced' regardless of file
        const stats = cacheStats();
        expect(stats.entries).toBe(1);
    });

    it('returns { ok: true }', async () => {
        const result = cacheSet({ path: join(testDir, 'x.txt'), content: 'data' });
        expect(result.ok).toBe(true);
    });
});

describe('cacheInvalidate', () => {
    it('removes a single entry', async () => {
        const file = join(testDir, 'e.txt');
        await writeFile(file, 'content');
        await cacheGet({ path: file });
        expect(cacheStats().entries).toBe(1);

        const result = cacheInvalidate({ path: file });
        expect(result.removed).toBe(1);
        expect(cacheStats().entries).toBe(0);
    });

    it('returns 0 when file not in cache', () => {
        const result = cacheInvalidate({ path: join(testDir, 'missing.txt') });
        expect(result.removed).toBe(0);
    });

    it('clears entire cache when path is omitted', async () => {
        const f1 = join(testDir, 'f1.txt');
        const f2 = join(testDir, 'f2.txt');
        await writeFile(f1, 'a');
        await writeFile(f2, 'b');
        await cacheGet({ path: f1 });
        await cacheGet({ path: f2 });
        expect(cacheStats().entries).toBe(2);

        const result = cacheInvalidate({});
        expect(result.removed).toBe(2);
        expect(cacheStats().entries).toBe(0);
    });
});

describe('cacheWarmup', () => {
    it('loads all existing files', async () => {
        const f1 = join(testDir, 'w1.txt');
        const f2 = join(testDir, 'w2.txt');
        await writeFile(f1, 'data1');
        await writeFile(f2, 'data2');

        const result = await cacheWarmup({ paths: [f1, f2] });
        expect(result.loaded).toBe(2);
        expect(result.failed).toBe(0);
        expect(cacheStats().entries).toBe(2);
    });

    it('counts failures for missing files', async () => {
        const result = await cacheWarmup({
            paths: [join(testDir, 'missing1.txt'), join(testDir, 'missing2.txt')],
        });
        expect(result.loaded).toBe(0);
        expect(result.failed).toBe(2);
    });
});

describe('cacheStats', () => {
    it('returns correct metrics', async () => {
        _resetCacheStore();
        const file = join(testDir, 's.txt');
        await writeFile(file, 'hello');
        await cacheGet({ path: file }); // miss
        await cacheGet({ path: file }); // hit

        const stats = cacheStats();
        expect(stats.entries).toBe(1);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(0.5);
        expect(stats.totalBytes).toBeGreaterThan(0);
    });

    it('returns hitRate 0 when no reads', () => {
        const stats = cacheStats();
        expect(stats.hitRate).toBe(0);
    });
});

describe('cache brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('cache:get', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cache:set', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cache:invalidate', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cache:warmup', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cache:stats', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
