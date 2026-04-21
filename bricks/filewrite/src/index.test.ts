// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fwAppend, fwCreate, fwWrite } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-filewrite-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('fwWrite', () => {
    it('creates a new file', async () => {
        const path = join(testDir, 'new.txt');
        const result = await fwWrite({ path, content: 'hello' });
        expect(result.written).toBe(true);
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('hello');
    });

    it('overwrites an existing file', async () => {
        const path = join(testDir, 'existing.txt');
        await fwWrite({ path, content: 'original' });
        await fwWrite({ path, content: 'overwritten' });
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('overwritten');
    });
});

describe('fwAppend', () => {
    it('appends to an existing file', async () => {
        const path = join(testDir, 'append.txt');
        await fwWrite({ path, content: 'line1\n' });
        const result = await fwAppend({ path, content: 'line2\n' });
        expect(result.appended).toBe(true);
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('line1\nline2\n');
    });

    it('creates file if not exists', async () => {
        const path = join(testDir, 'newappend.txt');
        await fwAppend({ path, content: 'data' });
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('data');
    });
});

describe('fwCreate', () => {
    it('creates file if not exists', async () => {
        const path = join(testDir, 'created.txt');
        const result = await fwCreate({ path, content: 'initial' });
        expect(result.created).toBe(true);
        const content = await readFile(path, 'utf-8');
        expect(content).toBe('initial');
    });

    it('throws if file already exists', async () => {
        const path = join(testDir, 'exists.txt');
        await fwWrite({ path, content: 'existing' });
        await expect(fwCreate({ path, content: 'new' })).rejects.toThrow('File already exists');
    });
});

describe('filewrite brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('filewrite:write', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filewrite:append', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('filewrite:create', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
