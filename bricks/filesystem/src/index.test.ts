// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fsDelete, fsList, fsRead, fsSearch, fsWrite } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-fs-test-'));
    await writeFile(join(testDir, 'hello.txt'), 'Hello World\n');
    await writeFile(join(testDir, 'code.ts'), 'const x = 42;\nconst y = "hello";\n');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('fsRead', () => {
    it('reads a file', async () => {
        const result = await fsRead({ path: join(testDir, 'hello.txt') });
        expect(result.content).toBe('Hello World\n');
    });
    it('throws on non-existent file', async () => {
        await expect(fsRead({ path: join(testDir, 'nope.txt') })).rejects.toThrow();
    });
});

describe('fsWrite', () => {
    it('writes a file', async () => {
        const result = await fsWrite({ path: join(testDir, 'new.txt'), content: 'new content' });
        expect(result.written).toBe(true);
        const read = await fsRead({ path: join(testDir, 'new.txt') });
        expect(read.content).toBe('new content');
    });
});

describe('fsList', () => {
    it('lists files in a directory', async () => {
        const result = await fsList({ path: testDir });
        expect(result.entries).toContain('f hello.txt');
        expect(result.entries).toContain('f code.ts');
    });
});

describe('fsSearch', () => {
    it('finds pattern in files', async () => {
        const result = await fsSearch({ path: testDir, pattern: '42' });
        expect(result.matches.length).toBe(1);
        expect(result.matches[0]).toContain('code.ts:1:');
    });
    it('filters by glob', async () => {
        const result = await fsSearch({ path: testDir, pattern: 'Hello', glob: '*.txt' });
        expect(result.matches.length).toBe(1);
    });
});

describe('fsDelete', () => {
    it('deletes a file', async () => {
        await fsWrite({ path: join(testDir, 'to-delete.txt'), content: 'bye' });
        const result = await fsDelete({ path: join(testDir, 'to-delete.txt') });
        expect(result.deleted).toBe(true);
        await expect(fsRead({ path: join(testDir, 'to-delete.txt') })).rejects.toThrow();
    });
});

describe('filesystem brick', () => {
    it('registers handlers and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledWith('filesystem:read', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filesystem:write', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filesystem:list', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filesystem:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filesystem:delete', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
