// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fsrchReplace, fsrchSearch } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-filesearch-test-'));
    await writeFile(join(testDir, 'hello.txt'), 'Hello World\nHello FocusMCP\n');
    await writeFile(join(testDir, 'code.ts'), 'const x = 42;\nconst y = "hello";\n');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('fsrchSearch', () => {
    it('finds pattern in files', async () => {
        const result = await fsrchSearch({ path: testDir, pattern: '42' });
        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches[0]).toContain('code.ts:1:');
    });

    it('filters by glob', async () => {
        const result = await fsrchSearch({ path: testDir, pattern: 'Hello', glob: '*.txt' });
        expect(result.matches.every((m) => m.includes('.txt'))).toBe(true);
    });

    it('returns empty array when no match', async () => {
        const result = await fsrchSearch({ path: testDir, pattern: 'NOMATCHWHATSOEVER' });
        expect(result.matches).toHaveLength(0);
    });

    it('limits results to 100', async () => {
        const result = await fsrchSearch({ path: testDir, pattern: '.' });
        expect(result.matches.length).toBeLessThanOrEqual(100);
    });
});

describe('fsrchReplace', () => {
    it('replaces all occurrences in a file', async () => {
        const path = join(testDir, 'hello.txt');
        const result = await fsrchReplace({ path, pattern: 'Hello', replacement: 'Hi' });
        expect(result.replacements).toBe(2);
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('Hi World\nHi FocusMCP\n');
    });

    it('returns 0 replacements if pattern not found', async () => {
        const path = join(testDir, 'hello.txt');
        const result = await fsrchReplace({ path, pattern: 'NOMATCH', replacement: 'x' });
        expect(result.replacements).toBe(0);
    });

    it('throws on non-existent file', async () => {
        await expect(
            fsrchReplace({ path: join(testDir, 'nope.txt'), pattern: 'x', replacement: 'y' }),
        ).rejects.toThrow();
    });
});

describe('filesearch brick', () => {
    it('registers 2 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(2);
        expect(bus.handle).toHaveBeenCalledWith('filesearch:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filesearch:replace', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
