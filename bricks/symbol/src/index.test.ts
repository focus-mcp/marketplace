// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearBus,
    parseSymbols,
    type SymbolBrickBus,
    type SymbolInfo,
    setBus,
    symBody,
    symBulk,
    symFind,
    symGet,
} from './operations.ts';

// ─── Mock bus ────────────────────────────────────────────────────────────────
// Simulates treesitter:extract-symbols without loading wasm.
// Uses a minimal regex fallback so unit tests remain fast and self-contained.

function makeExtractResult(
    path: string,
    content: string,
): { symbols: SymbolInfo[]; imports: Array<{ from: string; names: string[] }>; exports: string[] } {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    const matchers: Array<{
        re: RegExp;
        kind: SymbolInfo['kind'];
        idx: number;
        exported: boolean;
    }> = [
        { re: /^export\s+(async\s+)?function\s+(\w+)/, kind: 'function', idx: 2, exported: true },
        { re: /^export\s+(default\s+)?class\s+(\w+)/, kind: 'class', idx: 2, exported: true },
        { re: /^export\s+interface\s+(\w+)/, kind: 'interface', idx: 1, exported: true },
        { re: /^export\s+type\s+(\w+)/, kind: 'type', idx: 1, exported: true },
        { re: /^export\s+const\s+(\w+)/, kind: 'variable', idx: 1, exported: true },
    ];
    const phpMatchers: Array<{
        re: RegExp;
        kind: SymbolInfo['kind'];
        idx: number;
        exported: boolean;
    }> = [
        { re: /^class\s+(\w+)/, kind: 'class', idx: 1, exported: true },
        { re: /^function\s+(\w+)/, kind: 'function', idx: 1, exported: true },
        {
            re: /^\s+(?:public|private|protected)\s+function\s+(\w+)/,
            kind: 'method',
            idx: 1,
            exported: false,
        },
    ];
    const pyMatchers: Array<{
        re: RegExp;
        kind: SymbolInfo['kind'];
        idx: number;
        exported: boolean;
    }> = [
        { re: /^class\s+(\w+)/, kind: 'class', idx: 1, exported: true },
        { re: /^def\s+(\w+)/, kind: 'function', idx: 1, exported: true },
    ];

    const isPhp = path.endsWith('.php');
    const isPy = path.endsWith('.py');
    const activeMatchers = isPhp ? phpMatchers : isPy ? pyMatchers : matchers;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const trimmed = isPhp ? line : line.trimStart();
        for (const { re, kind, idx, exported } of activeMatchers) {
            const m = re.exec(trimmed);
            if (m) {
                symbols.push({
                    name: m[idx] ?? '',
                    kind,
                    file: path,
                    line: i + 1,
                    endLine: i + 1,
                    signature: trimmed.trim(),
                    exported,
                });
                break;
            }
        }
    }
    return { symbols, imports: [], exports: [] };
}

function makeMockBus() {
    return {
        request: vi.fn(async (target: string, payload: unknown): Promise<unknown> => {
            if (target === 'treesitter:extract-symbols') {
                const { path, content } = payload as { path: string; content: string };
                return makeExtractResult(path, content);
            }
            if (target === 'treesitter:langs') {
                return { langs: ['typescript', 'php', 'python'] };
            }
            throw new Error(`Unexpected bus.request target: ${target}`);
        }) as unknown as SymbolBrickBus['request'],
        handle: vi.fn(() => vi.fn()),
        on: vi.fn(),
    };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-symbol-test-'));
    setBus(makeMockBus());
});

afterEach(async () => {
    clearBus();
    await rm(testDir, { recursive: true, force: true });
});

// ─── parseSymbols ─────────────────────────────────────────────────────────────

describe('parseSymbols', () => {
    it('parses TypeScript functions, classes, interfaces, types, consts', async () => {
        const content = [
            'export function doWork(): void {}',
            'export class MyService {}',
            'export interface IConfig {}',
            'export type Result = string;',
            'export const VERSION = 1;',
        ].join('\n');
        const syms = await parseSymbols('/test.ts', content);
        expect(syms).toHaveLength(5);
        const kinds = syms.map((s) => s.kind);
        expect(kinds).toContain('function');
        expect(kinds).toContain('class');
        expect(kinds).toContain('interface');
        expect(kinds).toContain('type');
        expect(kinds).toContain('variable');
    });

    it('returns empty array when no symbols match', async () => {
        const content = ['// just a comment', 'const x = 42;', 'let y = "hello";'].join('\n');
        const syms = await parseSymbols('/test.ts', content);
        expect(syms).toHaveLength(0);
    });

    it('parses PHP classes and methods', async () => {
        const content = [
            '<?php',
            'class UserService {',
            '    public function findUser(int $id): void {}',
            '    private function validate(): void {}',
            '}',
            'function helperFn(): void {}',
        ].join('\n');
        const syms = await parseSymbols('/UserService.php', content);
        expect(syms.some((s) => s.name === 'UserService' && s.kind === 'class')).toBe(true);
        expect(syms.some((s) => s.name === 'helperFn' && s.kind === 'function')).toBe(true);
    });

    it('parses Python functions and classes', async () => {
        const content = [
            'class MyClass:',
            '    def method_one(self):',
            '        pass',
            '',
            'def top_level_func():',
            '    pass',
        ].join('\n');
        const syms = await parseSymbols('/module.py', content);
        expect(syms.some((s) => s.name === 'MyClass' && s.kind === 'class')).toBe(true);
        expect(syms.some((s) => s.name === 'top_level_func')).toBe(true);
    });
});

// ─── collectFiles branch coverage ────────────────────────────────────────────

describe('collectFiles (symbol) — branch coverage', () => {
    it('recurses into subdirectories', async () => {
        const subDir = join(testDir, 'sub');
        await mkdir(subDir);
        await writeFile(join(testDir, 'root.ts'), 'export function root(): void {}');
        await writeFile(join(subDir, 'nested.ts'), 'export function nested(): void {}');
        const result = await symFind({ name: 'nested', dir: testDir });
        expect(result.symbols.some((s) => s.name === 'nested')).toBe(true);
    });

    it('ignores binary extension files', async () => {
        await writeFile(join(testDir, 'data.bin'), 'binary content');
        await writeFile(join(testDir, 'code.ts'), 'export function code(): void {}');
        const result = await symFind({ name: 'code', dir: testDir });
        expect(result.symbols.some((s) => s.name === 'code')).toBe(true);
    });

    it('ignores node_modules directories', async () => {
        const nmDir = join(testDir, 'node_modules', 'some-pkg');
        await mkdir(nmDir, { recursive: true });
        await writeFile(join(nmDir, 'index.ts'), 'export function ignoredFn(): void {}');
        await writeFile(join(testDir, 'app.ts'), 'export function appFn(): void {}');
        const result = await symFind({ name: 'ignored', dir: testDir });
        expect(result.symbols).toHaveLength(0);
    });
});

// ─── symFind ─────────────────────────────────────────────────────────────────

describe('symFind', () => {
    it('finds TypeScript symbols by substring', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            'export function getUserById(): void {}\nexport function getAll(): void {}',
        );
        const result = await symFind({ name: 'get', dir: testDir });
        expect(result.symbols.length).toBeGreaterThanOrEqual(2);
        expect(result.symbols.every((s) => s.name.toLowerCase().includes('get'))).toBe(true);
    });

    it('returns empty array when no match', async () => {
        await writeFile(join(testDir, 'b.ts'), 'export function alpha(): void {}');
        const result = await symFind({ name: 'xyz', dir: testDir });
        expect(result.symbols).toHaveLength(0);
    });

    it('finds PHP class symbols', async () => {
        await writeFile(
            join(testDir, 'Controller.php'),
            '<?php\nclass SomeController {\n    public function handleRequest(): void {}\n}\n',
        );
        const result = await symFind({ name: 'SomeController', dir: testDir });
        expect(result.symbols.some((s) => s.name === 'SomeController' && s.kind === 'class')).toBe(
            true,
        );
    });

    it('finds Python class symbols', async () => {
        await writeFile(
            join(testDir, 'processor.py'),
            'class DataProcessor:\n    def process(self):\n        pass\n',
        );
        const result = await symFind({ name: 'DataProcessor', dir: testDir });
        expect(result.symbols.some((s) => s.name === 'DataProcessor' && s.kind === 'class')).toBe(
            true,
        );
    });
});

// ─── symGet ──────────────────────────────────────────────────────────────────

describe('symGet', () => {
    it('returns exact TypeScript match', async () => {
        await writeFile(join(testDir, 'c.ts'), 'export function myFunc(): void {}');
        const result = await symGet({ name: 'myFunc', dir: testDir });
        expect(result.symbol).not.toBeNull();
        expect(result.symbol?.name).toBe('myFunc');
        expect(result.symbol?.kind).toBe('function');
    });

    it('returns exact PHP class match', async () => {
        await writeFile(
            join(testDir, 'service.php'),
            '<?php\nclass UserRepository {\n    public function find(int $id): void {}\n}\n',
        );
        const result = await symGet({ name: 'UserRepository', dir: testDir });
        expect(result.symbol).not.toBeNull();
        expect(result.symbol?.kind).toBe('class');
    });

    it('returns null when not found', async () => {
        await writeFile(join(testDir, 'd.ts'), 'export function other(): void {}');
        const result = await symGet({ name: 'missing', dir: testDir });
        expect(result.symbol).toBeNull();
    });
});

// ─── symBulk ─────────────────────────────────────────────────────────────────

describe('symBulk', () => {
    it('looks up multiple TypeScript symbols', async () => {
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

// ─── symBody ─────────────────────────────────────────────────────────────────

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

// ─── brick lifecycle ─────────────────────────────────────────────────────────

describe('symbol brick', () => {
    it('registers 4 handlers on start, injects bus, unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const mockBus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(),
        };

        await brick.start({ bus: mockBus });
        expect(mockBus.handle).toHaveBeenCalledTimes(4);
        expect(mockBus.handle).toHaveBeenCalledWith('symbol:find', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('symbol:get', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('symbol:bulk', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('symbol:body', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
