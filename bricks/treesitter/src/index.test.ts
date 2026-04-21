// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    indexStore,
    parseFile,
    tsCleanup,
    tsIndex,
    tsLangs,
    tsReindex,
    tsStatus,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-treesitter-test-'));
    indexStore.clear();
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    indexStore.clear();
});

describe('parseFile', () => {
    it('parses export function', () => {
        const result = parseFile('/test.ts', 'export function hello(): void {}', 0);
        expect(result.symbols).toHaveLength(1);
        expect(result.symbols[0]).toMatchObject({
            name: 'hello',
            kind: 'function',
            exported: true,
        });
    });

    it('parses export async function', () => {
        const result = parseFile(
            '/test.ts',
            'export async function fetchData(): Promise<void> {}',
            0,
        );
        expect(result.symbols[0]).toMatchObject({ name: 'fetchData', kind: 'function' });
    });

    it('parses export class', () => {
        const result = parseFile('/test.ts', 'export class MyClass {}', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyClass', kind: 'class', exported: true });
    });

    it('parses export interface', () => {
        const result = parseFile('/test.ts', 'export interface MyInterface {}', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyInterface', kind: 'interface' });
    });

    it('parses export type', () => {
        const result = parseFile('/test.ts', 'export type MyType = string | number;', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyType', kind: 'type' });
    });

    it('parses export const', () => {
        const result = parseFile('/test.ts', 'export const MY_CONST = 42;', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MY_CONST', kind: 'variable' });
    });

    it('parses imports', () => {
        const result = parseFile('/test.ts', "import { foo, bar } from './utils.ts';", 0);
        expect(result.imports).toHaveLength(1);
        expect(result.imports[0]).toMatchObject({ from: './utils.ts', names: ['foo', 'bar'] });
    });

    it('returns exports list', () => {
        const content = 'export function a() {}\nexport const b = 1;';
        const result = parseFile('/test.ts', content, 0);
        expect(result.exports).toContain('a');
        expect(result.exports).toContain('b');
    });

    it('stores mtime', () => {
        const result = parseFile('/test.ts', '', 12345);
        expect(result.mtime).toBe(12345);
    });
});

describe('tsIndex', () => {
    it('indexes directory and finds symbols', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            'export function doWork(): void {}\nexport const VALUE = 1;',
        );
        const result = await tsIndex({ dir: testDir });
        expect(result.files).toBe(1);
        expect(result.symbols).toBe(2);
        expect(indexStore.size).toBe(1);
    });

    it('indexes nested directories', async () => {
        const subDir = join(testDir, 'sub');
        await import('node:fs/promises').then((fs) => fs.mkdir(subDir));
        await writeFile(join(testDir, 'root.ts'), 'export function root() {}');
        await writeFile(join(subDir, 'nested.ts'), 'export function nested() {}');
        const result = await tsIndex({ dir: testDir });
        expect(result.files).toBe(2);
    });

    it('ignores non-TS/JS files', async () => {
        await writeFile(join(testDir, 'readme.md'), '# Hello');
        await writeFile(join(testDir, 'code.ts'), 'export function code() {}');
        const result = await tsIndex({ dir: testDir });
        expect(result.files).toBe(1);
    });
});

describe('tsReindex', () => {
    it('re-indexes a single file', async () => {
        const file = join(testDir, 'x.ts');
        await writeFile(file, 'export function original() {}');
        await tsIndex({ dir: testDir });
        expect(indexStore.get(file)?.symbols[0]?.name).toBe('original');

        await writeFile(file, 'export function updated() {}');
        await tsReindex({ path: file });
        expect(indexStore.get(file)?.symbols[0]?.name).toBe('updated');
    });
});

describe('tsStatus', () => {
    it('returns correct file and symbol counts', async () => {
        await writeFile(join(testDir, 'f.ts'), 'export function a() {}\nexport function b() {}');
        await tsIndex({ dir: testDir });
        const status = tsStatus();
        expect(status.files).toBe(1);
        expect(status.symbols).toBe(2);
        expect(status.langs).toContain('typescript');
    });
});

describe('tsCleanup', () => {
    it('clears the index', async () => {
        await writeFile(join(testDir, 'g.ts'), 'export function x() {}');
        await tsIndex({ dir: testDir });
        expect(indexStore.size).toBe(1);
        const result = tsCleanup();
        expect(result.removed).toBe(1);
        expect(indexStore.size).toBe(0);
    });
});

describe('tsLangs', () => {
    it('returns typescript and javascript', () => {
        expect(tsLangs()).toEqual(['typescript', 'javascript']);
    });
});

describe('parseFile — method and class branch coverage', () => {
    it('parses public methods inside a class', () => {
        const content = [
            'export class MyService {',
            '    doSomething() {}',
            '    helper() {}',
            '}',
        ].join('\n');
        const result = parseFile('/test.ts', content, 0);
        const methods = result.symbols.filter((s) => s.kind === 'method');
        expect(methods.length).toBeGreaterThanOrEqual(1);
        expect(methods.some((m) => m.name === 'doSomething')).toBe(true);
    });

    it('skips constructor and underscore-prefixed methods', () => {
        const content = [
            'export class MyClass {',
            '    constructor() {}',
            '    _private() {}',
            '    public() {}',
            '}',
        ].join('\n');
        const result = parseFile('/test.ts', content, 0);
        const names = result.symbols.filter((s) => s.kind === 'method').map((s) => s.name);
        expect(names).not.toContain('constructor');
        expect(names).not.toContain('_private');
        expect(names).toContain('public');
    });

    it('closes currentClass when closing brace is encountered', () => {
        const content = [
            'export class Box {',
            '    getValue() {}',
            '}',
            'export function standalone(): void {}',
        ].join('\n');
        const result = parseFile('/test.ts', content, 0);
        // standalone should be a function symbol, not a method of Box
        const fn = result.symbols.find((s) => s.name === 'standalone');
        expect(fn).toBeDefined();
        expect(fn?.kind).toBe('function');
    });

    it('parseFile handles line with no matching pattern (null branch)', () => {
        const content = [
            'export class Outer {',
            '    // just a comment inside class',
            '    helper() {}',
            '}',
        ].join('\n');
        const result = parseFile('/test.ts', content, 0);
        expect(result.symbols.some((s) => s.kind === 'class')).toBe(true);
    });
});

describe('treesitter brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('ts:index', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('ts:reindex', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('ts:status', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('ts:cleanup', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('ts:langs', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
