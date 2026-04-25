// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _resetWorkRootFlag,
    foBatch,
    foCopy,
    foDelete,
    foMove,
    foRename,
    getWorkRoot,
    setWorkRoot,
} from './operations.ts';

let testDir: string;
let originalWorkRoot: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-fileops-test-'));
    await writeFile(join(testDir, 'source.txt'), 'source content');
    originalWorkRoot = getWorkRoot();
    // Pin workRoot to testDir so all relative paths resolve there
    setWorkRoot(testDir);
});

afterEach(async () => {
    setWorkRoot(originalWorkRoot);
    await rm(testDir, { recursive: true, force: true });
});

// ─── workRoot + path sandboxing ───────────────────────────────────────────────

describe('workRoot sandboxing', () => {
    it('resolves relative path "./foo.ts" relative to workRoot, not process.cwd()', async () => {
        await writeFile(join(testDir, 'foo.ts'), 'ts content');
        const result = await foCopy({ from: './foo.ts', to: './foo.copy.ts' });
        // Must have operated inside testDir, not process.cwd()
        expect(result.from).toBe(join(testDir, 'foo.ts'));
        expect(result.to).toBe(join(testDir, 'foo.copy.ts'));
        const content = await readFile(join(testDir, 'foo.copy.ts'), 'utf-8');
        expect(content).toBe('ts content');
    });

    it('rejects a path that escapes workRoot via ../', async () => {
        await expect(foCopy({ from: '../escape.txt', to: './dest.txt' })).rejects.toThrow(
            /escapes workRoot|outside workRoot/,
        );
    });

    it('rejects deeply nested escape via ../../', async () => {
        await expect(foDelete({ path: '../../etc/passwd' })).rejects.toThrow(
            /escapes workRoot|outside workRoot/,
        );
    });

    it('rename target is confined to workRoot', async () => {
        const result = await foRename({ path: './source.txt', name: 'renamed.txt' });
        expect(result.from).toBe(join(testDir, 'source.txt'));
        expect(result.to).toBe(join(testDir, 'renamed.txt'));
    });
});

// ─── foMove ───────────────────────────────────────────────────────────────────

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

// ─── foCopy ───────────────────────────────────────────────────────────────────

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

// ─── foDelete ─────────────────────────────────────────────────────────────────

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

// ─── foRename ─────────────────────────────────────────────────────────────────

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

// ─── foBatch ─────────────────────────────────────────────────────────────────

describe('foBatch', () => {
    it('executes multiple ops in sequence', async () => {
        await writeFile(join(testDir, 'a.txt'), 'a');
        await writeFile(join(testDir, 'b.txt'), 'b');

        const result = await foBatch({
            ops: [
                { op: 'copy', from: join(testDir, 'a.txt'), to: join(testDir, 'a2.txt') },
                { op: 'rename', path: join(testDir, 'b.txt'), name: 'b2.txt' },
                { op: 'delete', path: join(testDir, 'a.txt') },
            ],
        });

        expect(result.results).toHaveLength(3);
        expect(result.results[0]).toMatchObject({ op: 'copy', copied: true });
        expect(result.results[1]).toMatchObject({ op: 'rename', renamed: true });
        expect(result.results[2]).toMatchObject({ op: 'delete', deleted: true });

        await expect(access(join(testDir, 'a2.txt'))).resolves.toBeUndefined();
        await expect(access(join(testDir, 'b2.txt'))).resolves.toBeUndefined();
        await expect(access(join(testDir, 'a.txt'))).rejects.toThrow();
    });

    it('stops on first error', async () => {
        await expect(
            foBatch({
                ops: [
                    { op: 'delete', path: join(testDir, 'nonexistent.txt') },
                    {
                        op: 'copy',
                        from: join(testDir, 'source.txt'),
                        to: join(testDir, 'dest.txt'),
                    },
                ],
            }),
        ).rejects.toThrow();
    });
});

// ─── setRoot guard (P0 — fail-fast) ──────────────────────────────────────────

describe('setRoot guard', () => {
    let guardTestDir: string;
    let savedRoot: string;

    beforeEach(async () => {
        guardTestDir = await mkdtemp(join(tmpdir(), 'focusmcp-guard-test-'));
        savedRoot = getWorkRoot();
        // Restore to a fresh "not explicitly set" state for each test
        _resetWorkRootFlag();
    });

    afterEach(async () => {
        setWorkRoot(savedRoot); // also sets _workRootExplicitlySet = true, fine for cleanup
        _resetWorkRootFlag();
        // Re-pin to testDir from outer scope (afterEach of outer suite will do final cleanup)
        setWorkRoot(testDir);
        await rm(guardTestDir, { recursive: true, force: true });
    });

    it('case 1: path exists under default workRoot → passes (retro-compat)', async () => {
        // Use the outer testDir which IS the current workRoot; source.txt already exists there
        // We need workRoot = testDir but _workRootExplicitlySet = false
        // Set workRoot via the internal setter without flag:
        // Trick: setWorkRoot sets flag, so we reset after
        setWorkRoot(testDir);
        _resetWorkRootFlag();

        await writeFile(join(testDir, 'retro.txt'), 'retro content');
        // Should NOT throw — path exists under default workRoot
        const result = await foCopy({ from: './retro.txt', to: './retro.copy.txt' });
        expect(result.copied).toBe(true);
    });

    it('case 2: path does not exist under default workRoot, setRoot NOT called → throws descriptive error', async () => {
        // workRoot = testDir (default), _workRootExplicitlySet = false
        setWorkRoot(testDir);
        _resetWorkRootFlag();

        await expect(foCopy({ from: './does-not-exist.txt', to: './dest.txt' })).rejects.toThrow(
            /workRoot not set: call fileops:setRoot first/,
        );
    });

    it('case 3: path does not exist under default workRoot, setRoot called with correct dir → passes', async () => {
        // guardTestDir has the file, but workRoot is testDir by default (flag NOT set yet)
        // Now call setRoot (which sets the flag) pointing to guardTestDir
        await writeFile(join(guardTestDir, 'target.txt'), 'target content');
        setWorkRoot(guardTestDir); // sets _workRootExplicitlySet = true

        // Should NOT throw — workRoot is explicitly set and file exists there
        const result = await foCopy({ from: './target.txt', to: './target.copy.txt' });
        expect(result.copied).toBe(true);
    });
});

// ─── brick lifecycle ──────────────────────────────────────────────────────────

describe('fileops brick', () => {
    it('registers 6 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(6);
        expect(bus.handle).toHaveBeenCalledWith('fileops:move', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:copy', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:delete', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:rename', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:batch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileops:setRoot', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
