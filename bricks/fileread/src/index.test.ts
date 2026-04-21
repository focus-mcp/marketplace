// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { frHead, frRange, frRead, frTail } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-fileread-test-'));
    await writeFile(join(testDir, 'sample.txt'), 'line1\nline2\nline3\nline4\nline5\n');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('frRead', () => {
    it('reads entire file content', async () => {
        const result = await frRead({ path: join(testDir, 'sample.txt') });
        expect(result.content).toBe('line1\nline2\nline3\nline4\nline5\n');
    });

    it('throws on non-existent file', async () => {
        await expect(frRead({ path: join(testDir, 'nope.txt') })).rejects.toThrow();
    });
});

describe('frHead', () => {
    it('returns first N lines', async () => {
        const result = await frHead({ path: join(testDir, 'sample.txt'), lines: 2 });
        expect(result.lines).toEqual(['line1', 'line2']);
    });

    it('defaults to 10 lines', async () => {
        const result = await frHead({ path: join(testDir, 'sample.txt') });
        expect(result.lines.length).toBeLessThanOrEqual(10);
    });
});

describe('frTail', () => {
    it('returns last N lines', async () => {
        const result = await frTail({ path: join(testDir, 'sample.txt'), lines: 2 });
        expect(result.lines).toEqual(['line5', '']);
    });

    it('defaults to 10 lines', async () => {
        const result = await frTail({ path: join(testDir, 'sample.txt') });
        expect(result.lines.length).toBeLessThanOrEqual(10);
    });
});

describe('frRange', () => {
    it('returns lines from-to (1-based, inclusive)', async () => {
        const result = await frRange({ path: join(testDir, 'sample.txt'), from: 2, to: 4 });
        expect(result.lines).toEqual(['line2', 'line3', 'line4']);
    });

    it('returns single line with from === to', async () => {
        const result = await frRange({ path: join(testDir, 'sample.txt'), from: 3, to: 3 });
        expect(result.lines).toEqual(['line3']);
    });
});

describe('fileread brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('fileread:read', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileread:head', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileread:tail', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fileread:range', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
