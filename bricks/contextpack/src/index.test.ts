// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cpBudget, cpEstimate, cpPack, cpPrioritize } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-contextpack-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

describe('cpPack', () => {
    it('packs files in signatures mode (default)', async () => {
        const f = await makeFile('a.ts', `export function foo() {}\nconst x = 1;\n`);
        const result = await cpPack({ files: [f] });
        expect(result.packed).toContain('export function foo');
        expect(result.packed).not.toContain('const x = 1');
        expect(result.fileCount).toBe(1);
        expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('packs files in full mode', async () => {
        const f = await makeFile('b.ts', `export function bar() {}\nconst y = 2;\n`);
        const result = await cpPack({ files: [f], mode: 'full' });
        expect(result.packed).toContain('const y = 2');
    });

    it('packs files in map mode', async () => {
        const f = await makeFile(
            'c.ts',
            `export function baz() {}\nimport x from 'x';\nconst y = 2;\n`,
        );
        const result = await cpPack({ files: [f], mode: 'map' });
        expect(result.packed).toContain('export function baz');
        expect(result.packed).toContain('import x');
    });

    it('skips missing files gracefully', async () => {
        const result = await cpPack({ files: [join(testDir, 'missing.ts')] });
        expect(result.fileCount).toBe(0);
        expect(result.totalTokens).toBe(0);
    });

    it('packs multiple files', async () => {
        const f1 = await makeFile('d1.ts', `export const a = 1;\n`);
        const f2 = await makeFile('d2.ts', `export const b = 2;\n`);
        const result = await cpPack({ files: [f1, f2] });
        expect(result.fileCount).toBe(2);
    });
});

describe('cpBudget', () => {
    it('fits files within budget', async () => {
        const f1 = await makeFile('e1.ts', `export function e1() {}\n`);
        const f2 = await makeFile('e2.ts', `export function e2() {}\nexport function e3() {}\n`);

        const result = await cpBudget({ files: [f1, f2], budget: 1000000 });
        expect(result.included.length).toBeGreaterThan(0);
        expect(result.tokensUsed).toBeLessThanOrEqual(1000000);
    });

    it('excludes files that exceed budget', async () => {
        const bigContent = 'export const x = 1;\n'.repeat(1000);
        const f = await makeFile('big.ts', bigContent);
        const result = await cpBudget({ files: [f], budget: 1 });
        expect(result.excluded).toContain(f);
        expect(result.included).toHaveLength(0);
    });

    it('handles missing files by excluding them', async () => {
        const result = await cpBudget({ files: [join(testDir, 'ghost.ts')], budget: 1000 });
        expect(result.excluded.length).toBe(1);
    });
});

describe('cpEstimate', () => {
    it('estimates tokens per file', async () => {
        const f = await makeFile('f.ts', `export function x() {}\n`);
        const result = await cpEstimate({ files: [f] });
        expect(result.estimatedTokens).toBeGreaterThan(0);
        expect(result.perFile).toHaveLength(1);
        expect(result.perFile[0]?.tokens).toBeGreaterThan(0);
    });

    it('returns 0 tokens for missing files', async () => {
        const result = await cpEstimate({ files: [join(testDir, 'missing.ts')] });
        expect(result.perFile[0]?.tokens).toBe(0);
    });
});

describe('cpPrioritize', () => {
    it('ranks files matching query higher', async () => {
        const auth = await makeFile('auth.ts', `export function login() {}`);
        const utils = await makeFile('utils.ts', `export function helper() {}`);

        const result = await cpPrioritize({ files: [utils, auth], query: 'auth' });
        expect(result.ranked[0]?.path).toBe(auth);
    });

    it('ranks by content if filename does not match', async () => {
        const f = await makeFile(
            'helpers.ts',
            `// authentication logic\nexport function check() {}`,
        );
        const g = await makeFile('other.ts', `export function unrelated() {}`);

        const result = await cpPrioritize({ files: [g, f], query: 'authentication' });
        expect(result.ranked[0]?.path).toBe(f);
    });

    it('returns all files ranked', async () => {
        const f1 = await makeFile('x.ts', `export const a = 1;\n`);
        const f2 = await makeFile('y.ts', `export const b = 2;\n`);
        const result = await cpPrioritize({ files: [f1, f2], query: 'nothing' });
        expect(result.ranked).toHaveLength(2);
    });
});

describe('contextpack brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('contextpack:pack', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('contextpack:budget', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('contextpack:estimate', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('contextpack:prioritize', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
