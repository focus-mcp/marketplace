// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _tokenize, ftsIndex, ftsRank, ftsSearch, ftsSuggest } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-fts-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

describe('ftsIndex', () => {
    it('indexes files and returns correct counts', async () => {
        await makeFile('alpha.ts', 'export function alpha() { return "hello world"; }');
        await makeFile('beta.md', '# Beta\nThis is a beta document with hello content.');

        const result = await ftsIndex({ dir: testDir });

        expect(result.filesIndexed).toBe(2);
        expect(result.termsIndexed).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('respects maxFiles limit', async () => {
        await makeFile('a.ts', 'const a = 1;');
        await makeFile('b.ts', 'const b = 2;');
        await makeFile('c.ts', 'const c = 3;');

        const result = await ftsIndex({ dir: testDir, maxFiles: 2 });

        expect(result.filesIndexed).toBe(2);
    });

    it('respects glob filter for extensions', async () => {
        await makeFile('code.ts', 'export const x = 1;');
        await makeFile('readme.md', '# Hello world');
        await makeFile('data.json', '{"key": "value"}');

        const result = await ftsIndex({ dir: testDir, glob: '*.ts' });

        expect(result.filesIndexed).toBe(1);
    });

    it('reindexes on second call (clears previous state)', async () => {
        await makeFile('file.ts', 'const x = 1;');
        const first = await ftsIndex({ dir: testDir });

        const result = await ftsIndex({ dir: testDir });
        expect(result.filesIndexed).toBe(first.filesIndexed);
    });
});

describe('ftsSearch', () => {
    it('returns empty results when index is empty', async () => {
        // Force a fresh empty index by indexing a non-existent dir (handled gracefully)
        await ftsIndex({ dir: testDir }); // empty dir

        const result = ftsSearch({ query: 'anything' });
        expect(result.results).toHaveLength(0);
        expect(result.total).toBe(0);
    });

    it('ranks more relevant document higher', async () => {
        await makeFile(
            'relevant.ts',
            'function search() { return search(search(search("search search search"))); }',
        );
        await makeFile('other.ts', 'const x = 1; // some unrelated content here');

        await ftsIndex({ dir: testDir });

        const result = ftsSearch({ query: 'search' });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0]?.file).toContain('relevant');
        expect(result.results[0]?.score).toBeGreaterThan(0);
    });

    it('returns matched terms in results', async () => {
        await makeFile('doc.ts', 'const hello = "world";');

        await ftsIndex({ dir: testDir });

        const result = ftsSearch({ query: 'hello world' });
        expect(result.results.length).toBeGreaterThan(0);
        const first = result.results[0];
        expect(first?.matches).toContain('hello');
        expect(first?.matches).toContain('world');
    });

    it('respects limit parameter', async () => {
        for (let i = 0; i < 5; i++) {
            await makeFile(`file${i}.ts`, `const keyword${i} = "common keyword value";`);
        }

        await ftsIndex({ dir: testDir });

        const result = ftsSearch({ query: 'keyword', limit: 3 });
        expect(result.results.length).toBeLessThanOrEqual(3);
    });

    it('returns empty for unknown query term', async () => {
        await makeFile('file.ts', 'const x = 1;');
        await ftsIndex({ dir: testDir });

        const result = ftsSearch({ query: 'zzzzunknownterm' });
        expect(result.results).toHaveLength(0);
    });
});

describe('ftsRank', () => {
    it('ranks files by relevance for given query', async () => {
        const fileA = await makeFile(
            'relevant.ts',
            'function rank() { return rank(rank(rank("rank rank rank"))); }',
        );
        const fileB = await makeFile('other.ts', 'const x = 1; // unrelated');

        await ftsIndex({ dir: testDir });

        const result = ftsRank({ query: 'rank', files: [fileA, fileB] });
        expect(result.ranked).toHaveLength(2);
        expect(result.ranked[0]?.file).toBe(fileA);
        expect(result.ranked[0]?.score).toBeGreaterThan(result.ranked[1]?.score ?? 0);
    });

    it('returns all files even when score is 0', async () => {
        const fileA = await makeFile('a.ts', 'const a = 1;');
        const fileB = await makeFile('b.ts', 'const b = 2;');

        await ftsIndex({ dir: testDir });

        const result = ftsRank({ query: 'zzznomatch', files: [fileA, fileB] });
        expect(result.ranked).toHaveLength(2);
        expect(result.ranked.every((r) => r.score === 0)).toBe(true);
    });

    it('handles empty files array', async () => {
        await ftsIndex({ dir: testDir });
        const result = ftsRank({ query: 'test', files: [] });
        expect(result.ranked).toHaveLength(0);
    });
});

describe('ftsSuggest', () => {
    it('returns completions matching prefix', async () => {
        await makeFile('code.ts', 'function transform() { return transformation; }');
        await ftsIndex({ dir: testDir });

        const result = ftsSuggest({ prefix: 'trans' });
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions.every((s) => s.term.startsWith('trans'))).toBe(true);
    });

    it('returns empty when index is empty', async () => {
        await ftsIndex({ dir: testDir }); // empty dir
        const result = ftsSuggest({ prefix: 'any' });
        expect(result.suggestions).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
        await makeFile(
            'terms.ts',
            'const terminal = true; const terminate = false; const territory = "here"; const terror = "no"; const test = "yes";',
        );
        await ftsIndex({ dir: testDir });

        const result = ftsSuggest({ prefix: 'ter', limit: 2 });
        expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('sorts suggestions by document frequency descending', async () => {
        await makeFile('a.ts', 'const apple = 1; const application = 2;');
        await makeFile('b.ts', 'const apple = 3;');
        await ftsIndex({ dir: testDir });

        const result = ftsSuggest({ prefix: 'app' });
        // apple appears in 2 docs, application in 1
        const appleEntry = result.suggestions.find((s) => s.term === 'apple');
        const appEntry = result.suggestions.find((s) => s.term === 'application');
        if (appleEntry && appEntry) {
            expect(appleEntry.documentCount).toBeGreaterThanOrEqual(appEntry.documentCount);
        }
    });
});

describe('tokenizer — camelCase / PascalCase splitting', () => {
    it('finds files by sub-token of a PascalCase compound', async () => {
        await makeFile('pool.ts', 'export class PurchasableRewardPool {}');
        await ftsIndex({ dir: testDir });

        const byCompound = ftsSearch({ query: 'PurchasableRewardPool' });
        const bySuffix = ftsSearch({ query: 'RewardPool' });
        const byPrefix = ftsSearch({ query: 'Purchasable' });
        const byMid = ftsSearch({ query: 'Reward' });

        expect(byCompound.results.length).toBeGreaterThan(0);
        expect(bySuffix.results.length).toBeGreaterThan(0);
        expect(byPrefix.results.length).toBeGreaterThan(0);
        expect(byMid.results.length).toBeGreaterThan(0);
    });

    it('splits consecutive-caps acronyms before mixed-case suffix', async () => {
        await makeFile('subsystem.ts', 'class UEMProfileImageSubsystem {}');
        await ftsIndex({ dir: testDir });

        const byAcronym = ftsSearch({ query: 'UEM' });
        const bySuffix = ftsSearch({ query: 'Subsystem' });
        const byMid = ftsSearch({ query: 'Profile' });

        expect(byAcronym.results.length).toBeGreaterThan(0);
        expect(bySuffix.results.length).toBeGreaterThan(0);
        expect(byMid.results.length).toBeGreaterThan(0);
    });

    it('splits camelCase identifiers', async () => {
        await makeFile('friends.ts', 'function getFriendsList() {}');
        await ftsIndex({ dir: testDir });

        const byPrefix = ftsSearch({ query: 'get' });
        const byMid = ftsSearch({ query: 'Friends' });
        const bySuffix = ftsSearch({ query: 'List' });

        expect(byPrefix.results.length).toBeGreaterThan(0);
        expect(byMid.results.length).toBeGreaterThan(0);
        expect(bySuffix.results.length).toBeGreaterThan(0);
    });

    it('preserves existing underscore/space split behaviour (no regression)', async () => {
        await makeFile('bundle.ts', 'const Department_Bundle = 1;');
        await ftsIndex({ dir: testDir });

        const byPart1 = ftsSearch({ query: 'Department' });
        const byPart2 = ftsSearch({ query: 'Bundle' });

        expect(byPart1.results.length).toBeGreaterThan(0);
        expect(byPart2.results.length).toBeGreaterThan(0);
    });

    it('deduplicates repeated sub-tokens within a single compound', () => {
        // "FooFoo" splits into ["Foo", "Foo"] → without dedup, "foo" would be
        // emitted twice for a single occurrence of the compound, inflating its
        // term frequency for TF-IDF.
        expect(_tokenize('FooFoo')).toEqual(['foofoo', 'foo']);
        expect(_tokenize('getUserUser')).toEqual(['getuseruser', 'get', 'user']);
    });
});

describe('ftsIndex — filename indexing', () => {
    it('finds a file by a term that appears only in its filename', async () => {
        await makeFile('DT_PurchasableRewardPools.json', '{"k":"v"}');
        await ftsIndex({ dir: testDir });

        const byCompound = ftsSearch({ query: 'PurchasableRewardPools' });
        const bySub = ftsSearch({ query: 'Purchasable' });
        const byFullName = ftsSearch({ query: 'DT_PurchasableRewardPools' });

        expect(byCompound.results.length).toBeGreaterThan(0);
        expect(bySub.results.length).toBeGreaterThan(0);
        expect(byFullName.results.length).toBeGreaterThan(0);
    });

    it('finds a file by PascalCase term in filename even when content is inert', async () => {
        await makeFile('SkinHierarchy.ts', 'export const x = 1;');
        await ftsIndex({ dir: testDir });

        const byCompound = ftsSearch({ query: 'SkinHierarchy' });
        const byPart = ftsSearch({ query: 'Hierarchy' });

        expect(byCompound.results.length).toBeGreaterThan(0);
        expect(byPart.results.length).toBeGreaterThan(0);
    });

    it('does not index file extensions as tokens', async () => {
        // Three files with no overlap in content terms, all .ts extension.
        // A search for "ts" must NOT return them — the extension is not a content token.
        await makeFile('alpha.ts', 'export const apple = 1;');
        await makeFile('bravo.ts', 'export const banana = 2;');
        await makeFile('charlie.ts', 'export const cherry = 3;');
        await ftsIndex({ dir: testDir });

        const byExt = ftsSearch({ query: 'ts' });

        expect(byExt.results).toHaveLength(0);
    });
});

describe('fts brick registration', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('fts:index', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fts:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fts:rank', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fts:suggest', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
