// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _resetSession,
    _setSessionsDir,
    _trackFileAccess,
    sesContext,
    sesHistory,
    sesRestore,
    sesSave,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-session-test-'));
    _setSessionsDir(testDir);
    _resetSession();
});

afterEach(async () => {
    _setSessionsDir(undefined);
    await rm(testDir, { recursive: true, force: true });
});

describe('sesSave + sesRestore', () => {
    it('saves and restores a session', async () => {
        const data = { files: ['a.ts', 'b.ts'], context: 'feature dev', notes: 'wip' };
        const saveResult = await sesSave({ name: 'my-session', data });
        expect(saveResult.ok).toBe(true);
        expect(saveResult.path).toContain('my-session');

        const restoreResult = await sesRestore({ name: 'my-session' });
        expect(restoreResult.data).toEqual(data);
        expect(restoreResult.savedAt).toBeTruthy();
    });

    it('returns null for non-existent session', async () => {
        const result = await sesRestore({ name: 'ghost' });
        expect(result.data).toBeNull();
        expect(result.savedAt).toBeNull();
    });

    it('saves partial data', async () => {
        await sesSave({ name: 'partial', data: { context: 'only context' } });
        const result = await sesRestore({ name: 'partial' });
        expect(result.data?.context).toBe('only context');
        expect(result.data?.files).toBeUndefined();
    });
});

describe('sesContext', () => {
    it('returns initial empty context', () => {
        const ctx = sesContext();
        expect(ctx.operations).toBe(0);
        expect(ctx.filesAccessed).toHaveLength(0);
        expect(ctx.startedAt).toBeTruthy();
    });

    it('tracks file accesses', () => {
        _trackFileAccess('a.ts');
        _trackFileAccess('b.ts');
        _trackFileAccess('a.ts'); // duplicate, should not add
        const ctx = sesContext();
        expect(ctx.operations).toBe(3);
        expect(ctx.filesAccessed).toHaveLength(2);
    });
});

describe('sesHistory', () => {
    it('lists saved sessions', async () => {
        await sesSave({ name: 'sess1', data: { files: ['x.ts'] } });
        await sesSave({ name: 'sess2', data: { files: ['y.ts', 'z.ts'] } });

        const result = await sesHistory();
        expect(result.sessions.length).toBe(2);
        const s1 = result.sessions.find((s) => s.name === 'sess1');
        expect(s1?.fileCount).toBe(1);
        const s2 = result.sessions.find((s) => s.name === 'sess2');
        expect(s2?.fileCount).toBe(2);
    });

    it('returns empty list when no sessions', async () => {
        const result = await sesHistory();
        expect(result.sessions).toHaveLength(0);
    });
});

describe('session brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('session:save', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('session:restore', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('session:context', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('session:history', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
