// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tbAnalyze, tbEstimate, tbFill, tbOptimize } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-tb-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── tbEstimate ──────────────────────────────────────────────────────────────

describe('tbEstimate', () => {
    it('estimates tokens from text', async () => {
        const result = await tbEstimate({ text: 'hello world' });
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.chars).toBe(11);
        expect(result.lines).toBe(1);
    });

    it('estimates tokens from file path', async () => {
        const file = join(testDir, 'sample.ts');
        await writeFile(file, 'const x = 1;\nconst y = 2;\n');
        const result = await tbEstimate({ path: file });
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.chars).toBeGreaterThan(0);
        expect(result.lines).toBeGreaterThan(0);
    });

    it('code files get higher token density than prose', async () => {
        const prose = 'This is a normal sentence. It contains words and spaces.';
        const code = 'function hello() { return "world"; } const x = hello();';
        const proseResult = await tbEstimate({ text: prose });
        const codeResult = await tbEstimate({ text: code });
        // Code should use lower chars/token ratio (more tokens per char)
        const proseRatio = prose.length / proseResult.tokens;
        const codeRatio = code.length / codeResult.tokens;
        expect(codeRatio).toBeLessThanOrEqual(proseRatio);
    });

    it('throws when neither text nor path provided', async () => {
        await expect(tbEstimate({})).rejects.toThrow();
    });

    it('throws on non-existent file path', async () => {
        await expect(tbEstimate({ path: join(testDir, 'nope.ts') })).rejects.toThrow();
    });
});

// ─── tbAnalyze ───────────────────────────────────────────────────────────────

describe('tbAnalyze', () => {
    it('analyzes files in a directory', async () => {
        await writeFile(join(testDir, 'a.ts'), 'const x = 1;');
        await writeFile(join(testDir, 'b.ts'), 'const y = 2;\nconst z = 3;');
        const result = await tbAnalyze({ dir: testDir });
        expect(result.files.length).toBe(2);
        expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('sorts files by token count descending', async () => {
        await writeFile(join(testDir, 'small.ts'), 'x');
        await writeFile(join(testDir, 'large.ts'), 'const x = 1;\n'.repeat(50));
        const result = await tbAnalyze({ dir: testDir });
        expect(result.files[0]?.tokens ?? 0).toBeGreaterThanOrEqual(result.files[1]?.tokens ?? 0);
    });

    it('top10 contains at most 10 entries', async () => {
        for (let i = 0; i < 15; i++) {
            await writeFile(join(testDir, `file${i}.ts`), `const x${i} = ${i};`);
        }
        const result = await tbAnalyze({ dir: testDir });
        expect(result.top10.length).toBeLessThanOrEqual(10);
    });

    it('respects maxFiles limit', async () => {
        for (let i = 0; i < 10; i++) {
            await writeFile(join(testDir, `f${i}.ts`), `const x = ${i};`);
        }
        const result = await tbAnalyze({ dir: testDir, maxFiles: 3 });
        expect(result.files.length).toBeLessThanOrEqual(3);
    });

    it('ignores node_modules', async () => {
        await mkdir(join(testDir, 'node_modules'));
        await writeFile(join(testDir, 'node_modules', 'pkg.js'), 'module.exports = {};');
        await writeFile(join(testDir, 'a.ts'), 'const x = 1;');
        const result = await tbAnalyze({ dir: testDir });
        const paths = result.files.map((f) => f.path);
        expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
    });

    it('returns empty results for empty directory', async () => {
        const result = await tbAnalyze({ dir: testDir });
        expect(result.files).toEqual([]);
        expect(result.totalTokens).toBe(0);
        expect(result.top10).toEqual([]);
    });
});

// ─── tbFill ──────────────────────────────────────────────────────────────────

describe('tbFill', () => {
    it('selects files within budget', async () => {
        const files: string[] = [];
        for (let i = 0; i < 5; i++) {
            const f = join(testDir, `f${i}.ts`);
            await writeFile(f, `const x${i} = ${i};`);
            files.push(f);
        }
        const result = await tbFill({ budget: 10, files });
        expect(result.used).toBeLessThanOrEqual(10);
        expect(result.remaining).toBe(10 - result.used);
    });

    it('defaults to signatures mode', async () => {
        const f = join(testDir, 'a.ts');
        await writeFile(f, 'const x = 1;');
        const result = await tbFill({ budget: 1000, files: [f] });
        expect(result.selected[0]?.mode).toBe('signatures');
    });

    it('returns empty when budget is 0', async () => {
        const f = join(testDir, 'a.ts');
        await writeFile(f, 'const x = 1;');
        const result = await tbFill({ budget: 0, files: [f] });
        expect(result.selected).toEqual([]);
        expect(result.used).toBe(0);
    });

    it('handles full mode', async () => {
        const f = join(testDir, 'a.ts');
        await writeFile(f, 'const x = 1;');
        const result = await tbFill({ budget: 1000, files: [f], mode: 'full' });
        expect(result.selected[0]?.mode).toBe('full');
    });
});

// ─── tbOptimize ──────────────────────────────────────────────────────────────

describe('tbOptimize', () => {
    it('generates a plan for files in directory', async () => {
        await writeFile(join(testDir, 'a.ts'), 'const x = 1;');
        await writeFile(join(testDir, 'b.ts'), 'const y = 2;');
        const result = await tbOptimize({ budget: 100, dir: testDir });
        expect(result.plan.length).toBe(2);
        expect(['signatures', 'map', 'full']).toContain(result.plan[0]?.recommendedMode);
    });

    it('fits is true when total estimate fits budget', async () => {
        await writeFile(join(testDir, 'tiny.ts'), 'x');
        const result = await tbOptimize({ budget: 10000, dir: testDir });
        expect(result.fits).toBe(true);
    });

    it('fits is false when total estimate exceeds budget', async () => {
        for (let i = 0; i < 20; i++) {
            await writeFile(join(testDir, `f${i}.ts`), 'const x = 1;\n'.repeat(100));
        }
        const result = await tbOptimize({ budget: 1, dir: testDir });
        expect(result.fits).toBe(false);
    });

    it('returns empty plan for empty directory', async () => {
        const result = await tbOptimize({ budget: 1000, dir: testDir });
        expect(result.plan).toEqual([]);
        expect(result.totalEstimate).toBe(0);
        expect(result.fits).toBe(true);
    });
});

// ─── tokenbudget brick ───────────────────────────────────────────────────────

describe('tokenbudget brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('tokenbudget:estimate', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('tokenbudget:analyze', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('tokenbudget:fill', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('tokenbudget:optimize', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
