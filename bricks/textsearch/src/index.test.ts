// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { txtGrouped, txtRegex, txtReplace, txtSearch } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-textsearch-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── txtSearch ────────────────────────────────────────────────────────────────

describe('txtSearch', () => {
    it('finds plain text matches with line numbers and context', async () => {
        await makeFile('a.ts', 'line one\nhello world\nline three\n');

        const result = await txtSearch({ dir: testDir, pattern: 'hello world' });
        expect(result.matches).toHaveLength(1);
        const m = result.matches[0];
        expect(m?.file).toBe('a.ts');
        expect(m?.line).toBe(2);
        expect(m?.column).toBe(1);
        expect(m?.text).toBe('hello world');
        expect(m?.contextBefore).toBe('line one');
        expect(m?.contextAfter).toBe('line three');
    });

    it('returns empty when no matches', async () => {
        await makeFile('a.ts', 'nothing here\n');
        const result = await txtSearch({ dir: testDir, pattern: 'notfound' });
        expect(result.matches).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.truncated).toBe(false);
    });

    it('searches across multiple files', async () => {
        await makeFile('a.ts', 'foo bar\n');
        await makeFile('b.ts', 'baz foo\n');
        await makeFile('c.ts', 'nothing\n');

        const result = await txtSearch({ dir: testDir, pattern: 'foo' });
        expect(result.matches).toHaveLength(2);
        const files = result.matches.map((m) => m.file).sort();
        expect(files).toEqual(['a.ts', 'b.ts']);
    });

    it('respects maxResults and sets truncated', async () => {
        await makeFile('a.ts', Array.from({ length: 10 }, (_, i) => `match line ${i}`).join('\n'));

        const result = await txtSearch({ dir: testDir, pattern: 'match', maxResults: 3 });
        expect(result.matches).toHaveLength(3);
        expect(result.truncated).toBe(true);
    });

    it('filters by glob', async () => {
        await makeFile('a.ts', 'hello ts\n');
        await makeFile('b.js', 'hello js\n');

        const result = await txtSearch({ dir: testDir, pattern: 'hello', glob: '*.ts' });
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]?.file).toBe('a.ts');
    });

    it('returns empty for empty dir', async () => {
        const result = await txtSearch({ dir: testDir, pattern: 'anything' });
        expect(result.matches).toHaveLength(0);
    });

    it('skips binary files', async () => {
        const binaryPath = join(testDir, 'binary.ts');
        await writeFile(binaryPath, Buffer.from([0x00, 0x01, 0x68, 0x65, 0x6c, 0x6c, 0x6f]));

        const result = await txtSearch({ dir: testDir, pattern: 'hello' });
        expect(result.matches).toHaveLength(0);
    });

    it('provides empty context strings at file boundaries', async () => {
        await makeFile('a.ts', 'only line');

        const result = await txtSearch({ dir: testDir, pattern: 'only line' });
        expect(result.matches[0]?.contextBefore).toBe('');
        expect(result.matches[0]?.contextAfter).toBe('');
    });
});

// ─── txtRegex ─────────────────────────────────────────────────────────────────

describe('txtRegex', () => {
    it('finds regex matches with capture groups context', async () => {
        await makeFile('a.ts', 'const foo = 42;\nconst bar = 99;\n');

        const result = await txtRegex({ dir: testDir, pattern: 'const \\w+ = \\d+' });
        expect(result.matches.length).toBeGreaterThanOrEqual(2);
    });

    it('is case-insensitive by default', async () => {
        await makeFile('a.ts', 'Hello World\n');

        const result = await txtRegex({ dir: testDir, pattern: 'hello world' });
        expect(result.matches).toHaveLength(1);
    });

    it('respects custom flags', async () => {
        await makeFile('a.ts', 'Hello World\n');

        const resultCS = await txtRegex({ dir: testDir, pattern: 'hello world', flags: '' });
        expect(resultCS.matches).toHaveLength(0);

        const resultCI = await txtRegex({ dir: testDir, pattern: 'hello world', flags: 'i' });
        expect(resultCI.matches).toHaveLength(1);
    });

    it('returns empty on invalid regex', async () => {
        await makeFile('a.ts', 'some content\n');
        const result = await txtRegex({ dir: testDir, pattern: '[invalid(' });
        expect(result.matches).toHaveLength(0);
        expect(result.truncated).toBe(false);
    });

    it('respects maxResults', async () => {
        await makeFile('a.ts', 'match\nmatch\nmatch\nmatch\nmatch\n');
        const result = await txtRegex({ dir: testDir, pattern: 'match', maxResults: 2 });
        expect(result.matches).toHaveLength(2);
        expect(result.truncated).toBe(true);
    });

    it('reports correct column for match', async () => {
        await makeFile('a.ts', '  const x = 1;\n');
        const result = await txtRegex({ dir: testDir, pattern: 'const' });
        expect(result.matches[0]?.column).toBe(3); // 1-indexed, 2 spaces before
    });
});

// ─── txtReplace ───────────────────────────────────────────────────────────────

describe('txtReplace', () => {
    it('dry run returns changes without modifying files', async () => {
        const filePath = await makeFile('a.ts', 'foo bar foo\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: 'foo',
            replacement: 'baz',
        });

        expect(result.applied).toBe(false);
        expect(result.totalReplacements).toBe(1);
        expect(result.filesAffected).toBe(1);
        // File should NOT be modified
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('foo bar foo\n');
    });

    it('applies changes when apply=true', async () => {
        const filePath = await makeFile('a.ts', 'foo bar\nbaz foo\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: 'foo',
            replacement: 'qux',
            apply: true,
        });

        expect(result.applied).toBe(true);
        expect(result.filesAffected).toBe(1);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('qux');
        expect(content).not.toContain('foo');
    });

    it('supports regex replace with capture groups', async () => {
        await makeFile('a.ts', 'const x = 1;\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: 'const (\\w+)',
            replacement: 'let $1',
            isRegex: true,
            apply: true,
        });

        expect(result.totalReplacements).toBe(1);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(join(testDir, 'a.ts'), 'utf-8');
        expect(content).toContain('let x');
    });

    it('returns empty changes when pattern not found', async () => {
        await makeFile('a.ts', 'nothing here\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: 'notfound',
            replacement: 'x',
        });

        expect(result.totalReplacements).toBe(0);
        expect(result.filesAffected).toBe(0);
    });

    it('returns no changes for invalid regex', async () => {
        await makeFile('a.ts', 'content\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: '[invalid(',
            replacement: 'x',
            isRegex: true,
        });

        expect(result.changes).toHaveLength(0);
        expect(result.applied).toBe(false);
    });

    it('filters by glob during replace', async () => {
        const tsFile = await makeFile('a.ts', 'foo ts\n');
        const jsFile = await makeFile('b.js', 'foo js\n');

        await txtReplace({
            dir: testDir,
            pattern: 'foo',
            replacement: 'bar',
            glob: '*.ts',
            apply: true,
        });

        const { readFile } = await import('node:fs/promises');
        expect(await readFile(tsFile, 'utf-8')).toContain('bar');
        expect(await readFile(jsFile, 'utf-8')).toContain('foo');
    });

    it('escapes special regex chars in literal mode', async () => {
        await makeFile('a.ts', 'price: $10.00\n');

        const result = await txtReplace({
            dir: testDir,
            pattern: '$10.00',
            replacement: '$20.00',
            apply: true,
        });

        expect(result.totalReplacements).toBe(1);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(join(testDir, 'a.ts'), 'utf-8');
        expect(content).toContain('$20.00');
    });
});

// ─── txtGrouped ───────────────────────────────────────────────────────────────

describe('txtGrouped', () => {
    it('groups results by file with match counts', async () => {
        await makeFile('a.ts', 'foo\nfoo\nbar\n');
        await makeFile('b.ts', 'foo\nbaz\n');
        await makeFile('c.ts', 'nothing\n');

        const result = await txtGrouped({ dir: testDir, pattern: 'foo' });
        expect(result.totalFiles).toBe(2);
        expect(result.totalMatches).toBe(3);

        const aEntry = result.groups.find((g) => g.file === 'a.ts');
        expect(aEntry?.count).toBe(2);
        expect(aEntry?.lines).toEqual([1, 2]);

        const bEntry = result.groups.find((g) => g.file === 'b.ts');
        expect(bEntry?.count).toBe(1);
    });

    it('supports regex grouping', async () => {
        await makeFile('a.ts', 'const x = 1;\nconst y = 2;\nlet z = 3;\n');

        const result = await txtGrouped({ dir: testDir, pattern: 'const \\w+', isRegex: true });
        expect(result.totalMatches).toBe(2);
    });

    it('returns empty when no matches', async () => {
        await makeFile('a.ts', 'nothing here\n');

        const result = await txtGrouped({ dir: testDir, pattern: 'notfound' });
        expect(result.groups).toHaveLength(0);
        expect(result.totalFiles).toBe(0);
        expect(result.totalMatches).toBe(0);
    });

    it('returns empty for empty dir', async () => {
        const result = await txtGrouped({ dir: testDir, pattern: 'anything' });
        expect(result.groups).toHaveLength(0);
    });

    it('returns empty for invalid regex', async () => {
        await makeFile('a.ts', 'content\n');
        const result = await txtGrouped({ dir: testDir, pattern: '[invalid(', isRegex: true });
        expect(result.groups).toHaveLength(0);
    });

    it('is case-insensitive by default', async () => {
        await makeFile('a.ts', 'Hello\nWORLD\nhello world\n');

        const result = await txtGrouped({ dir: testDir, pattern: 'hello' });
        expect(result.totalMatches).toBe(2);
    });
});

// ─── brick registration ───────────────────────────────────────────────────────

describe('textsearch brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('textsearch:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('textsearch:regex', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('textsearch:replace', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('textsearch:grouped', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('re-registers handlers on second start (clears old ones first)', async () => {
        const { default: brick } = await import('./index.ts');
        const firstUnsubs: Array<() => void> = [];
        const bus1 = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                firstUnsubs.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus: bus1 });
        expect(bus1.handle).toHaveBeenCalledTimes(4);

        // Second start should call unsubs from first start
        const bus2 = {
            handle: vi.fn(() => vi.fn()),
            on: vi.fn(),
        };
        await brick.start({ bus: bus2 });
        for (const unsub of firstUnsubs) {
            expect(unsub).toHaveBeenCalled();
        }
        expect(bus2.handle).toHaveBeenCalledTimes(4);

        await brick.stop();
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('textsearch');
        expect(brick.manifest.prefix).toBe('txt');
        expect(brick.manifest.tools).toHaveLength(4);
    });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
    it('skips node_modules directories', async () => {
        const nmDir = join(testDir, 'node_modules');
        await import('node:fs/promises').then((fs) => fs.mkdir(nmDir));
        await writeFile(join(nmDir, 'dep.ts'), 'match\n');

        const result = await txtSearch({ dir: testDir, pattern: 'match' });
        expect(result.matches).toHaveLength(0);
    });

    it('skips dot directories', async () => {
        const dotDir = join(testDir, '.hidden');
        await import('node:fs/promises').then((fs) => fs.mkdir(dotDir));
        await writeFile(join(dotDir, 'file.ts'), 'match\n');

        const result = await txtSearch({ dir: testDir, pattern: 'match' });
        expect(result.matches).toHaveLength(0);
    });

    it('handles files with unsupported extensions', async () => {
        await writeFile(join(testDir, 'image.png'), 'match');
        await writeFile(join(testDir, 'archive.zip'), 'match');

        const result = await txtSearch({ dir: testDir, pattern: 'match' });
        expect(result.matches).toHaveLength(0);
    });

    it('txtSearch handles non-existent dir gracefully', async () => {
        const nonExistent = resolve(testDir, 'does-not-exist');
        // Should throw or return empty — we just check it does not crash with unhandled error
        await expect(txtSearch({ dir: nonExistent, pattern: 'x' })).rejects.toThrow();
    });

    it('glob *.{ts,tsx} matches both extensions', async () => {
        await makeFile('a.ts', 'hello\n');
        await makeFile('b.tsx', 'hello\n');
        await makeFile('c.js', 'hello\n');

        const result = await txtSearch({ dir: testDir, pattern: 'hello', glob: '*.{ts,tsx}' });
        expect(result.matches).toHaveLength(2);
        const files = result.matches.map((m) => m.file).sort();
        expect(files).toEqual(['a.ts', 'b.tsx']);
    });

    it('searches in nested subdirectories', async () => {
        const subDir = join(testDir, 'sub');
        await import('node:fs/promises').then((fs) => fs.mkdir(subDir));
        await writeFile(join(subDir, 'nested.ts'), 'deep match\n');

        const result = await txtSearch({ dir: testDir, pattern: 'deep match' });
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]?.file).toBe('sub/nested.ts');
    });
});
