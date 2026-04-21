// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _setReposFile,
    reposList,
    reposRegister,
    reposStats,
    reposUnregister,
} from './operations.ts';

let testDir: string;
let reposFile: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-repos-test-'));
    reposFile = join(testDir, 'repos.json');
    _setReposFile(reposFile);
});

afterEach(async () => {
    _setReposFile(undefined);
    await rm(testDir, { recursive: true, force: true });
});

describe('reposList', () => {
    it('returns empty list initially', async () => {
        const result = await reposList();
        expect(result.repos).toHaveLength(0);
    });

    it('returns registered repos', async () => {
        await reposRegister({ name: 'my-repo', path: testDir });
        const result = await reposList();
        expect(result.repos).toHaveLength(1);
        expect(result.repos[0]?.name).toBe('my-repo');
    });
});

describe('reposRegister', () => {
    it('registers a new repo', async () => {
        const result = await reposRegister({ name: 'r1', path: testDir });
        expect(result.ok).toBe(true);
        const list = await reposList();
        expect(list.repos.some((r) => r.name === 'r1')).toBe(true);
    });

    it('updates existing repo', async () => {
        await reposRegister({ name: 'r1', path: '/old' });
        await reposRegister({ name: 'r1', path: testDir });
        const list = await reposList();
        const r1 = list.repos.find((r) => r.name === 'r1');
        expect(r1?.path).toBe(testDir);
        expect(list.repos.filter((r) => r.name === 'r1')).toHaveLength(1);
    });
});

describe('reposUnregister', () => {
    it('removes a registered repo', async () => {
        await reposRegister({ name: 'to-remove', path: testDir });
        const result = await reposUnregister({ name: 'to-remove' });
        expect(result.ok).toBe(true);
        const list = await reposList();
        expect(list.repos.some((r) => r.name === 'to-remove')).toBe(false);
    });

    it('returns false for non-existing repo', async () => {
        const result = await reposUnregister({ name: 'ghost' });
        expect(result.ok).toBe(false);
    });
});

describe('reposStats', () => {
    it('returns stats for a registered repo', async () => {
        const repoDir = join(testDir, 'myrepo');
        await mkdtemp(join(tmpdir(), 'x'))
            .then(() => null)
            .catch(() => null);
        const { mkdir } = await import('node:fs/promises');
        await mkdir(repoDir);
        await writeFile(join(repoDir, 'a.ts'), 'export const x = 1;\nconst y = 2;\n');
        await writeFile(join(repoDir, 'b.js'), 'console.log("hi");\n');

        await reposRegister({ name: 'test-repo', path: repoDir });
        const result = await reposStats({ name: 'test-repo' });
        expect(result.files).toBe(2);
        expect(result.lines).toBeGreaterThan(0);
        expect(result.languages['.ts']).toBe(1);
        expect(result.languages['.js']).toBe(1);
    });

    it('returns zeros for unknown repo', async () => {
        const result = await reposStats({ name: 'nonexistent' });
        expect(result.files).toBe(0);
        expect(result.lines).toBe(0);
    });
});

describe('repos brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('repos:list', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('repos:register', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('repos:unregister', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('repos:stats', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
