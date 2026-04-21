// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fdDelta, fdDiff, fdPatch } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-filediff-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('fdDiff', () => {
    it('returns empty string for identical files', async () => {
        const content = 'line1\nline2\nline3\n';
        await writeFile(join(testDir, 'a.txt'), content);
        await writeFile(join(testDir, 'b.txt'), content);
        const result = await fdDiff({ a: join(testDir, 'a.txt'), b: join(testDir, 'b.txt') });
        expect(result.diff).toBe('');
    });

    it('returns unified diff for different files', async () => {
        await writeFile(join(testDir, 'a.txt'), 'hello\nworld\n');
        await writeFile(join(testDir, 'b.txt'), 'hello\nearth\n');
        const result = await fdDiff({ a: join(testDir, 'a.txt'), b: join(testDir, 'b.txt') });
        expect(result.diff).toContain('---');
        expect(result.diff).toContain('+++');
        expect(result.diff).toContain('-world');
        expect(result.diff).toContain('+earth');
    });

    it('throws on non-existent file', async () => {
        await expect(
            fdDiff({ a: join(testDir, 'nope.txt'), b: join(testDir, 'also-nope.txt') }),
        ).rejects.toThrow();
    });
});

describe('fdPatch', () => {
    it('applies a patch to a file', async () => {
        const original = 'hello\nworld\n';
        await writeFile(join(testDir, 'file.txt'), original);

        const patch = `--- a/file.txt\n+++ b/file.txt\n@@ -1,2 +1,2 @@\n hello\n-world\n+earth\n`;
        const result = await fdPatch({ path: join(testDir, 'file.txt'), patch });
        expect(result.content).toContain('earth');
        expect(result.content).not.toContain('world');
    });

    it('throws on non-existent file', async () => {
        await expect(fdPatch({ path: join(testDir, 'nope.txt'), patch: '' })).rejects.toThrow();
    });
});

describe('fdDelta', () => {
    it('returns changed lines only', async () => {
        const result = await fdDelta({ before: 'a\nb\nc', after: 'a\nd\nc' });
        expect(result.delta).toContain('-b');
        expect(result.delta).toContain('+d');
        expect(result.delta).not.toContain('a');
        expect(result.delta).not.toContain('c');
    });

    it('returns empty array for identical strings', async () => {
        const result = await fdDelta({ before: 'same\nlines', after: 'same\nlines' });
        expect(result.delta).toEqual([]);
    });
});

describe('filediff brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('filediff:diff', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filediff:patch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filediff:delta', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
