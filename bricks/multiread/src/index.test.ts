// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mrBatch, mrDedup, mrMerge } from './operations.ts';

let testDir: string;
let pathA: string;
let pathB: string;
let pathC: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-multiread-test-'));
    pathA = join(testDir, 'a.ts');
    pathB = join(testDir, 'b.ts');
    pathC = join(testDir, 'c.txt');
    await writeFile(pathA, "import { foo } from 'foo';\nconst a = 1;\n");
    await writeFile(pathB, "import { foo } from 'foo';\nconst b = 2;\n");
    await writeFile(pathC, 'hello world\n');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('mrBatch', () => {
    it('reads multiple files and returns a record', async () => {
        const result = await mrBatch({ paths: [pathA, pathB] });
        expect(result.files[pathA]).toContain('const a = 1');
        expect(result.files[pathB]).toContain('const b = 2');
    });

    it('throws on non-existent file', async () => {
        await expect(mrBatch({ paths: [join(testDir, 'nope.ts')] })).rejects.toThrow();
    });
});

describe('mrDedup', () => {
    it('identifies shared imports and removes them from files', async () => {
        const result = await mrDedup({ paths: [pathA, pathB] });
        expect(result.sharedImports).toContain("import { foo } from 'foo';");
        expect(result.files[pathA]).not.toContain("import { foo } from 'foo';");
        expect(result.files[pathB]).not.toContain("import { foo } from 'foo';");
        expect(result.files[pathA]).toContain('const a = 1');
        expect(result.files[pathB]).toContain('const b = 2');
    });

    it('returns empty sharedImports when no shared imports', async () => {
        const result = await mrDedup({ paths: [pathA, pathC] });
        expect(result.sharedImports).toHaveLength(0);
    });
});

describe('mrMerge', () => {
    it('concatenates files with default filename separator', async () => {
        const result = await mrMerge({ paths: [pathA, pathC] });
        expect(result.content).toContain('--- a.ts ---');
        expect(result.content).toContain('--- c.txt ---');
        expect(result.content).toContain('const a = 1');
        expect(result.content).toContain('hello world');
    });

    it('uses custom separator when provided', async () => {
        const result = await mrMerge({ paths: [pathA, pathC], separator: '====' });
        expect(result.content).toContain('====');
        expect(result.content).not.toContain('--- a.ts ---');
    });
});

describe('multiread brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('multiread:batch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('multiread:dedup', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('multiread:merge', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
