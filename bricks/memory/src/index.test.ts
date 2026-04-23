// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _setMemoryDir, memForget, memList, memRecall, memSearch, memStore } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-memory-test-'));
    _setMemoryDir(testDir);
});

afterEach(async () => {
    _setMemoryDir(undefined);
    await rm(testDir, { recursive: true, force: true });
});

describe('memStore + memRecall', () => {
    it('stores and recalls a value', async () => {
        await memStore({ key: 'test-key', value: 'hello world', tags: ['greeting'] });
        const result = await memRecall({ key: 'test-key' });
        expect(result.value).toBe('hello world');
        expect(result.tags).toContain('greeting');
        expect(result.storedAt).toBeTruthy();
    });

    it('returns null for unknown key', async () => {
        const result = await memRecall({ key: 'does-not-exist' });
        expect(result.value).toBeNull();
        expect(result.tags).toHaveLength(0);
    });

    it('stores without tags', async () => {
        await memStore({ key: 'no-tags', value: 'bare value' });
        const result = await memRecall({ key: 'no-tags' });
        expect(result.value).toBe('bare value');
        expect(result.tags).toHaveLength(0);
    });

    it('overwrites existing key', async () => {
        await memStore({ key: 'k', value: 'v1' });
        await memStore({ key: 'k', value: 'v2' });
        const result = await memRecall({ key: 'k' });
        expect(result.value).toBe('v2');
    });
});

describe('memSearch', () => {
    beforeEach(async () => {
        await memStore({
            key: 'project-arch',
            value: 'monorepo with pnpm',
            tags: ['architecture'],
        });
        await memStore({ key: 'testing', value: 'vitest for unit tests', tags: ['testing'] });
        await memStore({ key: 'unrelated', value: 'nothing here', tags: [] });
    });

    it('finds by key substring', async () => {
        const result = await memSearch({ query: 'project' });
        expect(result.results.some((r) => r.key === 'project-arch')).toBe(true);
    });

    it('finds by value substring', async () => {
        const result = await memSearch({ query: 'vitest' });
        expect(result.results.some((r) => r.key === 'testing')).toBe(true);
    });

    it('finds by tag', async () => {
        const result = await memSearch({ query: 'architecture' });
        expect(result.results.some((r) => r.key === 'project-arch')).toBe(true);
    });

    it('respects limit', async () => {
        const result = await memSearch({ query: 'e', limit: 1 });
        expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty when no match', async () => {
        const result = await memSearch({ query: 'zzz-no-match-zzz' });
        expect(result.results).toHaveLength(0);
    });
});

describe('memForget', () => {
    it('deletes existing entry', async () => {
        await memStore({ key: 'to-delete', value: 'bye' });
        const result = await memForget({ key: 'to-delete' });
        expect(result.deleted).toBe(true);
        const recall = await memRecall({ key: 'to-delete' });
        expect(recall.value).toBeNull();
    });

    it('returns false for non-existing key', async () => {
        const result = await memForget({ key: 'ghost' });
        expect(result.deleted).toBe(false);
    });
});

describe('memList', () => {
    beforeEach(async () => {
        await memStore({ key: 'a', value: '1', tags: ['x'] });
        await memStore({ key: 'b', value: '2', tags: ['y'] });
        await memStore({ key: 'c', value: '3', tags: ['x', 'y'] });
    });

    it('lists all keys', async () => {
        const result = await memList({});
        expect(result.keys.length).toBe(3);
    });

    it('filters by tag', async () => {
        const result = await memList({ tag: 'x' });
        expect(result.keys.every((k) => k.tags.includes('x'))).toBe(true);
        expect(result.keys.length).toBe(2);
    });
});

describe('memory brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('memory:store', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('memory:recall', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('memory:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('memory:forget', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('memory:list', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
