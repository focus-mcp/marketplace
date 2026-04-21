// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flFind, flGlob, flList, flTree } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-filelist-test-'));
    await writeFile(join(testDir, 'hello.txt'), 'Hello');
    await writeFile(join(testDir, 'code.ts'), 'const x = 1;');
    await mkdir(join(testDir, 'sub'));
    await writeFile(join(testDir, 'sub', 'nested.ts'), 'export {};');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('flList', () => {
    it('lists top-level entries with type prefix', async () => {
        const result = await flList({ path: testDir });
        expect(result.entries).toContain('f hello.txt');
        expect(result.entries).toContain('f code.ts');
        expect(result.entries).toContain('d sub');
    });
});

describe('flTree', () => {
    it('returns indented tree lines', async () => {
        const result = await flTree({ path: testDir });
        expect(result.tree.some((l) => l.includes('hello.txt'))).toBe(true);
        expect(result.tree.some((l) => l.includes('nested.ts'))).toBe(true);
    });

    it('respects depth limit', async () => {
        const result = await flTree({ path: testDir, depth: 1 });
        expect(result.tree.some((l) => l.includes('nested.ts'))).toBe(false);
    });
});

describe('flGlob', () => {
    it('matches files by glob pattern', async () => {
        const result = await flGlob({ path: testDir, pattern: '*.ts' });
        expect(result.matches.some((m) => m.includes('code.ts'))).toBe(true);
        expect(result.matches.some((m) => m.includes('hello.txt'))).toBe(false);
    });

    it('matches nested files', async () => {
        const result = await flGlob({ path: testDir, pattern: '*.ts' });
        expect(result.matches.some((m) => m.includes('nested.ts'))).toBe(true);
    });
});

describe('flFind', () => {
    it('finds files by name substring', async () => {
        const result = await flFind({ path: testDir, name: 'hello' });
        expect(result.matches.some((m) => m.includes('hello.txt'))).toBe(true);
    });

    it('finds nested files', async () => {
        const result = await flFind({ path: testDir, name: 'nested' });
        expect(result.matches.some((m) => m.includes('nested.ts'))).toBe(true);
    });

    it('returns empty array if no match', async () => {
        const result = await flFind({ path: testDir, name: 'doesnotexist' });
        expect(result.matches).toHaveLength(0);
    });
});

describe('filelist brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('filelist:list', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filelist:tree', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filelist:glob', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filelist:find', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
