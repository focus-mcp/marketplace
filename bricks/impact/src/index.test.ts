// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { impAffected, impAnalyze, impPropagate } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-impact-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

describe('impAnalyze', () => {
    it('finds direct dependents', async () => {
        const util = await makeFile('util.ts', `export function x() {}`);
        await makeFile('main.ts', `import { x } from './util';\n`);

        const result = await impAnalyze({ file: util, dir: testDir });
        expect(result.directDependents.length).toBe(1);
        expect(result.directDependents[0]?.file).toContain('main');
        expect(result.totalAffected).toBeGreaterThanOrEqual(1);
    });

    it('returns empty when no dependents', async () => {
        const solo = await makeFile('solo.ts', `export const x = 1;`);
        await makeFile('other.ts', `export const y = 2;`);

        const result = await impAnalyze({ file: solo, dir: testDir });
        expect(result.directDependents).toHaveLength(0);
        expect(result.totalAffected).toBe(0);
    });
});

describe('impAffected', () => {
    it('returns all affected files', async () => {
        const util = await makeFile('util.ts', `export function x() {}`);
        await makeFile('main.ts', `import { x } from './util';\n`);

        const result = await impAffected({ files: [util], dir: testDir });
        expect(result.count).toBeGreaterThanOrEqual(1);
        expect(result.affected.some((a) => a.file.includes('main'))).toBe(true);
    });

    it('handles empty files list', async () => {
        const result = await impAffected({ files: [], dir: testDir });
        expect(result.count).toBe(0);
    });
});

describe('impPropagate', () => {
    it('traces propagation levels', async () => {
        const a = await makeFile('a.ts', `export const a = 1;`);
        await makeFile('b.ts', `import { a } from './a';\nexport const b = 1;`);
        await makeFile('c.ts', `import { b } from './b';\nexport const c = 1;`);

        const result = await impPropagate({ file: a, dir: testDir, maxDepth: 3 });
        expect(result.totalReach).toBeGreaterThanOrEqual(1);
    });

    it('respects maxDepth', async () => {
        const a = await makeFile('a.ts', `export const a = 1;`);
        await makeFile('b.ts', `import { a } from './a';\nexport const b = 1;`);
        await makeFile('c.ts', `import { b } from './b';\nexport const c = 1;`);

        const result = await impPropagate({ file: a, dir: testDir, maxDepth: 1 });
        expect(result.levels.every((l) => l.depth <= 1)).toBe(true);
    });

    it('returns empty for isolated file', async () => {
        const iso = await makeFile('isolated.ts', `export const x = 1;`);
        const result = await impPropagate({ file: iso, dir: testDir });
        expect(result.totalReach).toBe(0);
    });
});

describe('impact brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('impact:analyze', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('impact:affected', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('impact:propagate', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
