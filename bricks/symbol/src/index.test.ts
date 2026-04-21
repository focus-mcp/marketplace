// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSymbols, symBody, symBulk, symFind, symGet } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-symbol-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('parseSymbols', () => {
    it('parses functions, classes, interfaces, types, consts', () => {
        const content = [
            'export function doWork(): void {}',
            'export class MyService {}',
            'export interface IConfig {}',
            'export type Result = string;',
            'export const VERSION = 1;',
        ].join('\n');
        const syms = parseSymbols('/test.ts', content);
        expect(syms).toHaveLength(5);
        expect(syms.map((s) => s.kind)).toEqual([
            'function',
            'class',
            'interface',
            'type',
            'variable',
        ]);
    });

    it('returns empty array for lines that match no pattern (null branch)', () => {
        const content = ['// just a comment', 'const x = 42;', 'let y = "hello";'].join('\n');
        const syms = parseSymbols('/test.ts', content);
        expect(syms).toHaveLength(0);
    });
});

describe('collectFiles (symbol) — branch coverage', () => {
    it('recurses into subdirectories', async () => {
        const { mkdir } = await import('node:fs/promises');
        const subDir = join(testDir, 'sub');
        await mkdir(subDir);
        await writeFile(join(testDir, 'root.ts'), 'export function root(): void {}');
        await writeFile(join(subDir, 'nested.ts'), 'export function nested(): void {}');
        const result = await symFind({ name: 'nested', dir: testDir });
        expect(result.symbols.some((s) => s.name === 'nested')).toBe(true);
    });

    it('ignores files with unsupported extensions', async () => {
        await writeFile(join(testDir, 'data.json'), '{}');
        await writeFile(join(testDir, 'code.ts'), 'export function code(): void {}');
        const result = await symFind({ name: 'code', dir: testDir });
        expect(result.symbols).toHaveLength(1);
    });
});

describe('symFind', () => {
    it('finds symbols by substring', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            'export function getUserById(): void {}\nexport function getAll(): void {}',
        );
        const result = await symFind({ name: 'get', dir: testDir });
        expect(result.symbols.length).toBeGreaterThanOrEqual(2);
        expect(result.symbols.every((s) => s.name.includes('get'))).toBe(true);
    });

    it('returns empty array when no match', async () => {
        await writeFile(join(testDir, 'b.ts'), 'export function alpha(): void {}');
        const result = await symFind({ name: 'xyz', dir: testDir });
        expect(result.symbols).toHaveLength(0);
    });
});

describe('symGet', () => {
    it('returns exact match', async () => {
        await writeFile(join(testDir, 'c.ts'), 'export function myFunc(): void {}');
        const result = await symGet({ name: 'myFunc', dir: testDir });
        expect(result.symbol).not.toBeNull();
        expect(result.symbol?.name).toBe('myFunc');
        expect(result.symbol?.kind).toBe('function');
    });

    it('returns null when not found', async () => {
        await writeFile(join(testDir, 'd.ts'), 'export function other(): void {}');
        const result = await symGet({ name: 'missing', dir: testDir });
        expect(result.symbol).toBeNull();
    });
});

describe('symBulk', () => {
    it('looks up multiple symbols', async () => {
        await writeFile(
            join(testDir, 'e.ts'),
            'export function alpha(): void {}\nexport function beta(): void {}',
        );
        const result = await symBulk({ names: ['alpha', 'beta', 'gamma'], dir: testDir });
        expect(result.results['alpha']).not.toBeNull();
        expect(result.results['beta']).not.toBeNull();
        expect(result.results['gamma']).toBeNull();
    });
});

describe('symBody', () => {
    it('reads specified line range', async () => {
        const file = join(testDir, 'f.ts');
        await writeFile(file, 'line1\nline2\nline3\nline4\nline5');
        const result = await symBody({ file, startLine: 2, endLine: 4 });
        expect(result.lines).toEqual(['line2', 'line3', 'line4']);
    });

    it('reads single line', async () => {
        const file = join(testDir, 'g.ts');
        await writeFile(file, 'a\nb\nc');
        const result = await symBody({ file, startLine: 2, endLine: 2 });
        expect(result.lines).toEqual(['b']);
    });
});

describe('symbol brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('sym:find', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sym:get', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sym:bulk', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sym:body', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
