// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    entries,
    kbFetch,
    kbIndex,
    kbPurge,
    kbRank,
    kbSearch,
    resetKnowledge,
} from './operations.ts';

beforeEach(() => {
    resetKnowledge();
});

afterEach(() => {
    resetKnowledge();
});

describe('kbIndex', () => {
    it('indexes a document and returns id, title, tokenCount', () => {
        const result = kbIndex({
            title: 'TypeScript Guide',
            content: 'TypeScript is a typed superset of JavaScript.',
        });
        expect(result.id).toBeTruthy();
        expect(result.title).toBe('TypeScript Guide');
        expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('stores the entry with tags and source', () => {
        const result = kbIndex({
            title: 'Node.js Tips',
            content: 'Use node:fs for file operations.',
            tags: ['node', 'tips'],
            source: 'https://nodejs.org',
        });
        const fetched = kbFetch({ id: result.id });
        if ('error' in fetched) throw new Error('Expected entry, got error');
        expect(fetched.tags).toEqual(['node', 'tips']);
        expect(fetched.source).toBe('https://nodejs.org');
    });

    it('generates unique ids per entry', () => {
        const a = kbIndex({ title: 'A', content: 'Alpha content here' });
        const b = kbIndex({ title: 'B', content: 'Beta content here' });
        expect(a.id).not.toBe(b.id);
    });
});

describe('kbSearch', () => {
    beforeEach(() => {
        kbIndex({
            title: 'TypeScript Basics',
            content: 'TypeScript adds types to JavaScript code.',
        });
        kbIndex({
            title: 'Node.js Guide',
            content: 'Node.js is a JavaScript runtime built on Chrome V8.',
        });
        kbIndex({
            title: 'Python Intro',
            content: 'Python is a high-level programming language.',
            tags: ['python'],
        });
    });

    it('returns results matching query', () => {
        const result = kbSearch({ query: 'JavaScript' });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results.every((r) => r.score > 0)).toBe(true);
    });

    it('returns ranked results (higher score first)', () => {
        const result = kbSearch({ query: 'JavaScript TypeScript types' });
        const scores = result.results.map((r) => r.score);
        for (let i = 1; i < scores.length; i++) {
            expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i] ?? 0);
        }
    });

    it('filters by tags', () => {
        const result = kbSearch({ query: 'language', tags: ['python'] });
        expect(result.results.every((r) => r.title.toLowerCase().includes('python'))).toBe(true);
    });

    it('respects limit', () => {
        kbIndex({ title: 'Extra JS', content: 'JavaScript everywhere in the browser.' });
        const result = kbSearch({ query: 'JavaScript', limit: 1 });
        expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty results for unmatched query', () => {
        const result = kbSearch({ query: 'zzzzunmatchedxxx' });
        expect(result.results).toHaveLength(0);
        expect(result.total).toBe(0);
    });

    it('includes snippet in results', () => {
        const result = kbSearch({ query: 'TypeScript' });
        expect(result.results[0]).toHaveProperty('snippet');
        expect(typeof result.results[0]?.snippet).toBe('string');
    });
});

describe('kbFetch', () => {
    it('fetches an existing entry by id', () => {
        const indexed = kbIndex({ title: 'Fetch Me', content: 'This entry should be fetchable.' });
        const fetched = kbFetch({ id: indexed.id });
        if ('error' in fetched) throw new Error('Expected entry');
        expect(fetched.id).toBe(indexed.id);
        expect(fetched.title).toBe('Fetch Me');
        expect(fetched.content).toBe('This entry should be fetchable.');
    });

    it('returns error for unknown id', () => {
        const fetched = kbFetch({ id: 'non-existent-id' });
        expect(fetched).toEqual({ error: 'not found' });
    });
});

describe('kbPurge', () => {
    it('purges entries older than given days', () => {
        const old = kbIndex({ title: 'Old Entry', content: 'This is an old document.' });
        // Manually backdate the entry
        const entry = entries.get(old.id);
        if (entry) entry.createdAt = Date.now() - 10 * 86_400_000; // 10 days ago

        const result = kbPurge({ olderThanDays: 5 });
        expect(result.purged).toBeGreaterThanOrEqual(1);
        expect(kbFetch({ id: old.id })).toEqual({ error: 'not found' });
    });

    it('purges entries by tag', () => {
        const a = kbIndex({
            title: 'Tagged Entry',
            content: 'Tagged document.',
            tags: ['obsolete'],
        });
        const b = kbIndex({ title: 'Keep This', content: 'Document to keep.' });

        const result = kbPurge({ tags: ['obsolete'] });
        expect(result.purged).toBe(1);
        expect(kbFetch({ id: a.id })).toEqual({ error: 'not found' });
        expect('error' in kbFetch({ id: b.id })).toBe(false);
    });

    it('returns remaining count after purge', () => {
        kbIndex({ title: 'Keep A', content: 'Keep this document.' });
        kbIndex({ title: 'Keep B', content: 'Keep this document too.', tags: ['keep'] });
        kbIndex({ title: 'Remove', content: 'Remove this document.', tags: ['remove'] });

        const result = kbPurge({ tags: ['remove'] });
        expect(result.remaining).toBe(2);
    });

    it('does nothing when no criteria match', () => {
        kbIndex({ title: 'Safe', content: 'Safe document.' });
        const result = kbPurge({ tags: ['nonexistent'] });
        expect(result.purged).toBe(0);
        expect(result.remaining).toBe(1);
    });
});

describe('kbRank', () => {
    beforeEach(() => {
        kbIndex({ title: 'Short JS', content: 'JavaScript.', tags: ['javascript'] });
        kbIndex({
            title: 'Long JS Guide',
            content:
                'JavaScript is a versatile language used in browsers and servers for building modern applications.',
            tags: ['javascript'],
        });
        kbIndex({
            title: 'Python',
            content: 'Python programming for data science and machine learning.',
        });
    });

    it('ranks with recency boost by default', () => {
        const result = kbRank({ query: 'JavaScript' });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results.every((r) => r.score > 0)).toBe(true);
    });

    it('ranks with length boost', () => {
        const result = kbRank({ query: 'JavaScript', boost: 'length' });
        expect(result.results.length).toBeGreaterThan(0);
        // Long content should score higher than short content
        const longIdx = result.results.findIndex((r) => r.title === 'Long JS Guide');
        const shortIdx = result.results.findIndex((r) => r.title === 'Short JS');
        if (longIdx !== -1 && shortIdx !== -1) {
            expect(longIdx).toBeLessThan(shortIdx);
        }
    });

    it('ranks with tags boost', () => {
        const result = kbRank({ query: 'javascript', boost: 'tags' });
        expect(result.results.length).toBeGreaterThan(0);
    });

    it('respects limit', () => {
        const result = kbRank({ query: 'JavaScript', limit: 1 });
        expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty for unmatched query', () => {
        const result = kbRank({ query: 'zzzzunmatchedxxx' });
        expect(result.results).toHaveLength(0);
    });
});

describe('knowledge brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('knowledge:index', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('knowledge:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('knowledge:fetch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('knowledge:purge', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('knowledge:rank', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
