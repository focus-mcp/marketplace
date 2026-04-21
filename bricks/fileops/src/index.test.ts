// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { foCopy, foDelete, foMove, foRename } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-fileops-test-'));
    await writeFile(join(testDir, 'source.txt'), 'source content');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('foMove', () => {
    it('moves a file to a new path', async () => {
        const from = join(testDir, 'source.txt');
        const to = join(testDir, 'moved.txt');
        const result = await foMove({ from, to });
        expect(result.moved).toBe(true);
        const content = await readFile(to, 'utf-8');
        expect(content).toBe('source content');
        await expect(access(from)).rejects.toThrow();
    });
});

describe('foCopy', () => {
    it('copies a file to a new path', async () => {
        const from = join(testDir, 'source.txt');
        const to = join(testDir, 'copy.txt');
        const result = await foCopy({ from, to });
        expect(result.copied).toBe(true);
        const content = await readFile(to, 'utf-8');
        expect(content).toBe('source content');
        // original still exists
        await expect(access(from)).resolves.toBeUndefined();
    });
});

describe('foDelete', () => {
    it('deletes a file', async () => {
        const path = join(testDir, 'source.txt');
        const result = await foDelete({ path });
        expect(result.deleted).toBe(true);
        await expect(access(path)).rejects.toThrow();
    });

    it('throws on non-existent file', async () => {
        await expect(foDelete({ path: join(testDir, 'nope.txt') })).rejects.toThrow();
    });
});

describe('foRename', () => {
    it('renames a file within its directory', async () => {
        const path = join(testDir, 'source.txt');
        const result = await foRename({ path, name: 'renamed.txt' });
        expect(result.renamed).toBe(true);
        const content = await readFile(join(testDir, 'renamed.txt'), 'utf-8');
        expect(content).toBe('source content');
        await expect(access(path)).rejects.toThrow();
    });
});

describe('fileops brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('fileops:move', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:copy', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:delete', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:rename', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
