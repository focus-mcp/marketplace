// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cgCallees, cgCallers, cgChain, cgDepth } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-callgraph-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('cgCallers', () => {
    it('finds call sites (excluding definition)', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            [
                'export function doWork(): void {}',
                'export function main(): void {',
                '    doWork();',
                '}',
            ].join('\n'),
        );
        const result = await cgCallers({ name: 'doWork', dir: testDir });
        expect(result.callers.length).toBeGreaterThanOrEqual(1);
        expect(result.callers.some((c) => c.snippet.includes('doWork()'))).toBe(true);
    });

    it('does not include the function definition as a caller', async () => {
        await writeFile(
            join(testDir, 'b.ts'),
            'export function helper(): void {}\nexport function helper2(): void { helper(); }',
        );
        const result = await cgCallers({ name: 'helper', dir: testDir });
        // The definition line should not appear
        const defLines = result.callers.filter((c) =>
            c.snippet.match(/^(export\s+)?(async\s+)?function\s+helper\b/),
        );
        expect(defLines).toHaveLength(0);
    });

    it('returns empty array when no callers', async () => {
        await writeFile(join(testDir, 'c.ts'), 'export function lone(): void {}');
        const result = await cgCallers({ name: 'lone', dir: testDir });
        expect(result.callers).toHaveLength(0);
    });
});

describe('cgCallees', () => {
    it('extracts function calls from a body', async () => {
        const file = join(testDir, 'd.ts');
        await writeFile(
            file,
            ['export function main(): void {', '    doWork();', '    helper();', '}'].join('\n'),
        );
        const result = await cgCallees({ name: 'main', file, startLine: 1, endLine: 4 });
        expect(result.callees).toContain('doWork');
        expect(result.callees).toContain('helper');
    });

    it('excludes keywords', async () => {
        const file = join(testDir, 'e.ts');
        await writeFile(file, 'export function x(): void {\n    if (true) { return; }\n}');
        const result = await cgCallees({ name: 'x', file, startLine: 1, endLine: 3 });
        expect(result.callees).not.toContain('if');
        expect(result.callees).not.toContain('return');
    });
});

describe('cgChain', () => {
    it('finds chain from a to c via b', async () => {
        await writeFile(
            join(testDir, 'f.ts'),
            [
                'export function a(): void { b(); }',
                'export function b(): void { c(); }',
                'export function c(): void {}',
            ].join('\n'),
        );
        const result = await cgChain({ from: 'a', to: 'c', dir: testDir });
        expect(result.chain).not.toBeNull();
        expect(result.chain).toContain('a');
        expect(result.chain).toContain('c');
    });

    it('returns null when no chain exists', async () => {
        await writeFile(
            join(testDir, 'g.ts'),
            'export function x(): void {}\nexport function y(): void {}',
        );
        const result = await cgChain({ from: 'x', to: 'y', dir: testDir });
        expect(result.chain).toBeNull();
    });
});

describe('cgDepth', () => {
    it('returns 0 for function with no callees', async () => {
        await writeFile(join(testDir, 'h.ts'), 'export function leaf(): void {}');
        const result = await cgDepth({ name: 'leaf', dir: testDir });
        expect(result.depth).toBe(0);
    });

    it('returns correct depth for call chain', async () => {
        await writeFile(
            join(testDir, 'i.ts'),
            [
                'export function top(): void { middle(); }',
                'export function middle(): void { bottom(); }',
                'export function bottom(): void {}',
            ].join('\n'),
        );
        const result = await cgDepth({ name: 'top', dir: testDir });
        expect(result.depth).toBeGreaterThanOrEqual(2);
    });

    it('respects custom maxDepth', async () => {
        await writeFile(
            join(testDir, 'j.ts'),
            [
                'export function a(): void { b(); }',
                'export function b(): void { c(); }',
                'export function c(): void { d(); }',
                'export function d(): void {}',
            ].join('\n'),
        );
        const result = await cgDepth({ name: 'a', dir: testDir, maxDepth: 2 });
        expect(result.depth).toBeLessThanOrEqual(2);
    });
});

describe('collectFiles (callgraph) — branch coverage', () => {
    it('ignores files with unsupported extensions', async () => {
        await writeFile(join(testDir, 'readme.md'), '# Readme');
        await writeFile(join(testDir, 'code.ts'), 'export function code(): void {}');
        // cgCallers triggers collectFiles internally
        const result = await cgCallers({ name: 'code', dir: testDir });
        // only code.ts is scanned — readme.md is ignored
        expect(result.callers).toHaveLength(0);
    });
});

describe('processLine — currentFn tracking branches', () => {
    it('closes currentFn when brace depth returns to 0 inside function body', async () => {
        // A multi-line function whose body closes on a subsequent line
        await writeFile(
            join(testDir, 'k.ts'),
            [
                'export function outer(): void {',
                '    helper();',
                '}',
                'export function unrelated(): void {}',
            ].join('\n'),
        );
        // cgChain exercises processLine / buildCallMap with multi-line functions
        const result = await cgChain({ from: 'outer', to: 'helper', dir: testDir });
        expect(result.chain).not.toBeNull();
    });
});

describe('callgraph brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('cg:callers', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cg:callees', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cg:chain', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('cg:depth', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
