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
    tsExtractCalls,
    tsExtractImports,
    tsExtractOutline,
    tsExtractRefs,
    tsExtractSymbols,
    tsIndex,
    tsLangs,
    tsReindex,
    tsStatus,
    tsSupportedExts,
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
    it('parses export function', async () => {
        const result = await parseFile('/test.ts', 'export function hello(): void {}', 0);
        expect(result.symbols).toHaveLength(1);
        expect(result.symbols[0]).toMatchObject({
            name: 'hello',
            kind: 'function',
            exported: true,
        });
    });

    it('parses export async function', async () => {
        const result = await parseFile(
            '/test.ts',
            'export async function fetchData(): Promise<void> {}',
            0,
        );
        expect(result.symbols.length).toBeGreaterThanOrEqual(1);
        expect(result.symbols[0]).toMatchObject({ name: 'fetchData', kind: 'function' });
    });

    it('parses export class', async () => {
        const result = await parseFile('/test.ts', 'export class MyClass {}', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyClass', kind: 'class', exported: true });
    });

    it('parses export interface', async () => {
        const result = await parseFile('/test.ts', 'export interface MyInterface {}', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyInterface', kind: 'interface' });
    });

    it('parses export type', async () => {
        const result = await parseFile('/test.ts', 'export type MyType = string | number;', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MyType', kind: 'type' });
    });

    it('parses export const', async () => {
        const result = await parseFile('/test.ts', 'export const MY_CONST = 42;', 0);
        expect(result.symbols[0]).toMatchObject({ name: 'MY_CONST', kind: 'variable' });
    });

    it('parses imports', async () => {
        const result = await parseFile('/test.ts', "import { foo, bar } from './utils.ts';", 0);
        expect(result.imports).toHaveLength(1);
        expect(result.imports[0]).toMatchObject({ from: './utils.ts', names: ['foo', 'bar'] });
    });

    it('returns exports list', async () => {
        const content = 'export function a() {}\nexport const b = 1;';
        const result = await parseFile('/test.ts', content, 0);
        expect(result.exports).toContain('a');
        expect(result.exports).toContain('b');
    });

    it('stores mtime', async () => {
        const result = await parseFile('/test.ts', '', 12345);
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

    it('ignores truly unsupported files (e.g. .txt) but indexes supported ones', async () => {
        await writeFile(join(testDir, 'notes.txt'), 'some text');
        await writeFile(join(testDir, 'code.ts'), 'export function code() {}');
        const result = await tsIndex({ dir: testDir });
        // Only .ts is indexed; .txt is not supported
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
    it('includes typescript and javascript', () => {
        const langs = tsLangs();
        expect(langs).toContain('typescript');
        expect(langs).toContain('javascript');
    });

    it('includes multi-language support', () => {
        const langs = tsLangs();
        expect(langs).toContain('php');
        expect(langs).toContain('python');
        expect(langs).toContain('go');
        expect(langs).toContain('rust');
        expect(langs).toContain('java');
    });
});

describe('parseFile — multi-language', () => {
    it('parses public methods inside a TypeScript class', async () => {
        const content = [
            'export class MyService {',
            '    doSomething() {}',
            '    helper() {}',
            '}',
        ].join('\n');
        const result = await parseFile('/test.ts', content, 0);
        const methods = result.symbols.filter((s) => s.kind === 'method');
        expect(methods.length).toBeGreaterThanOrEqual(1);
        expect(methods.some((m) => m.name === 'doSomething')).toBe(true);
    });

    it('skips constructor methods in TypeScript', async () => {
        const content = [
            'export class MyClass {',
            '    constructor() {}',
            '    public() {}',
            '}',
        ].join('\n');
        const result = await parseFile('/test.ts', content, 0);
        const names = result.symbols.filter((s) => s.kind === 'method').map((s) => s.name);
        expect(names).not.toContain('constructor');
        expect(names).toContain('public');
    });

    it('includes underscore-prefixed methods (intentional — tree-sitter indexes all symbols)', async () => {
        // Unlike the old regex parser which excluded _private methods,
        // tree-sitter indexes all methods including underscore-prefixed ones.
        // This is intentional: downstream bricks (callgraph, refs) need full symbol coverage.
        const content = [
            'export class MyClass {',
            '    _private() {}',
            '    publicMethod() {}',
            '}',
        ].join('\n');
        const result = await parseFile('/test.ts', content, 0);
        const names = result.symbols.filter((s) => s.kind === 'method').map((s) => s.name);
        expect(names).toContain('_private');
        expect(names).toContain('publicMethod');
    });

    it('handles class followed by standalone function in TypeScript', async () => {
        const content = [
            'export class Box {',
            '    getValue() {}',
            '}',
            'export function standalone(): void {}',
        ].join('\n');
        const result = await parseFile('/test.ts', content, 0);
        const fn = result.symbols.find((s) => s.name === 'standalone');
        expect(fn).toBeDefined();
        expect(fn?.kind).toBe('function');
    });

    it('parses PHP class and functions', async () => {
        const content = [
            '<?php',
            'namespace App;',
            'function helper(): string { return "hi"; }',
            'class MyController {',
            '    public function index(): void {}',
            '}',
        ].join('\n');
        const result = await parseFile('/controller.php', content, 0);
        const classes = result.symbols.filter((s) => s.kind === 'class');
        const funcs = result.symbols.filter((s) => s.kind === 'function');
        expect(classes.some((c) => c.name === 'MyController')).toBe(true);
        expect(funcs.some((f) => f.name === 'helper')).toBe(true);
    });

    it('parses Python functions and classes', async () => {
        const content = [
            'def my_func(x: str) -> None:',
            '    pass',
            'class MyClass:',
            '    def method(self) -> str:',
            '        return "hi"',
        ].join('\n');
        const result = await parseFile('/module.py', content, 0);
        expect(result.symbols.some((s) => s.name === 'my_func' && s.kind === 'function')).toBe(
            true,
        );
        expect(result.symbols.some((s) => s.name === 'MyClass' && s.kind === 'class')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'method' && s.kind === 'method')).toBe(true);
    });

    it('parses Go functions and types', async () => {
        const content = [
            'package main',
            'func Add(a, b int) int { return a + b }',
            'type MyStruct struct { Name string }',
        ].join('\n');
        const result = await parseFile('/main.go', content, 0);
        expect(result.symbols.some((s) => s.name === 'Add' && s.kind === 'function')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'MyStruct' && s.kind === 'class')).toBe(true);
    });

    it('parses Rust functions and structs', async () => {
        const content = [
            'pub fn add(a: i32, b: i32) -> i32 { a + b }',
            'pub struct MyStruct { name: String }',
        ].join('\n');
        const result = await parseFile('/lib.rs', content, 0);
        expect(result.symbols.some((s) => s.name === 'add' && s.kind === 'function')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'MyStruct' && s.kind === 'class')).toBe(true);
    });

    it('parses Java class and methods', async () => {
        const content = [
            'package com.example;',
            'public class MyClass {',
            '    public void myMethod() {}',
            '}',
        ].join('\n');
        const result = await parseFile('/MyClass.java', content, 0);
        expect(result.symbols.some((s) => s.name === 'MyClass' && s.kind === 'class')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'myMethod' && s.kind === 'method')).toBe(true);
    });

    it('returns empty result for truly unsupported extension (.xyz)', async () => {
        const result = await parseFile('/archive.xyz', '# Hello world', 0);
        expect(result.symbols).toHaveLength(0);
        expect(result.imports).toHaveLength(0);
        expect(result.exports).toHaveLength(0);
    });
});

describe('tsExtractSymbols', () => {
    it('extracts TypeScript symbols without indexing', async () => {
        const result = await tsExtractSymbols({
            path: '/src/service.ts',
            content: 'export function doWork(): void {}\nexport class MyService {}',
        });
        expect(result.symbols.some((s) => s.name === 'doWork' && s.kind === 'function')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'MyService' && s.kind === 'class')).toBe(true);
        // Should NOT be in the index store (pure extraction, no side-effects)
        expect(indexStore.has('/src/service.ts')).toBe(false);
    });

    it('extracts PHP symbols', async () => {
        const result = await tsExtractSymbols({
            path: '/src/UserController.php',
            content: [
                '<?php',
                'namespace App\\Controller;',
                'class UserController {',
                '    public function index(): void {}',
                '    public function show(int $id): void {}',
                '}',
            ].join('\n'),
        });
        expect(result.symbols.some((s) => s.name === 'UserController' && s.kind === 'class')).toBe(
            true,
        );
        expect(result.symbols.some((s) => s.name === 'index' && s.kind === 'method')).toBe(true);
    });

    it('extracts Python symbols', async () => {
        const result = await tsExtractSymbols({
            path: '/src/service.py',
            content: [
                'class DataService:',
                '    def process(self, data):',
                '        pass',
                '',
                'def helper_fn():',
                '    pass',
            ].join('\n'),
        });
        expect(result.symbols.some((s) => s.name === 'DataService' && s.kind === 'class')).toBe(
            true,
        );
        expect(result.symbols.some((s) => s.name === 'helper_fn')).toBe(true);
    });

    it('returns empty arrays for unsupported extension', async () => {
        const result = await tsExtractSymbols({
            path: '/data/config.bin',
            content: 'binary content',
        });
        expect(result.symbols).toHaveLength(0);
        expect(result.imports).toHaveLength(0);
        expect(result.exports).toHaveLength(0);
    });
});

describe('tsSupportedExts', () => {
    it('returns a non-empty array of extensions starting with a dot', () => {
        const { exts } = tsSupportedExts();
        expect(exts.length).toBeGreaterThan(0);
        for (const ext of exts) {
            expect(ext.startsWith('.')).toBe(true);
        }
    });

    it('includes expected languages (.ts, .php, .py, .go, .rs, .java)', () => {
        const { exts } = tsSupportedExts();
        const extSet = new Set(exts);
        expect(extSet.has('.ts')).toBe(true);
        expect(extSet.has('.php')).toBe(true);
        expect(extSet.has('.py')).toBe(true);
        expect(extSet.has('.go')).toBe(true);
        expect(extSet.has('.rs')).toBe(true);
        expect(extSet.has('.java')).toBe(true);
    });
});

describe('tsExtractImports', () => {
    it('extracts TS imports', async () => {
        const result = await tsExtractImports({
            path: '/src/app.ts',
            content: "import { foo, bar } from './utils.ts';\nimport type { T } from './types.ts';",
        });
        expect(result.imports.length).toBeGreaterThanOrEqual(1);
        expect(result.imports.some((i) => i.from === './utils.ts')).toBe(true);
    });

    it('extracts PHP use statements', async () => {
        const result = await tsExtractImports({
            path: '/src/Controller.php',
            content: "<?php\nuse App\\Service\\UserService;\nuse App\\Repository\\UserRepo;",
        });
        expect(result.imports.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts Python imports', async () => {
        const result = await tsExtractImports({
            path: '/src/module.py',
            content: 'import os\nfrom pathlib import Path\nfrom typing import List',
        });
        expect(result.imports.length).toBeGreaterThanOrEqual(2);
    });
});

describe('tsExtractRefs', () => {
    it('finds TypeScript usages of a name', async () => {
        const result = await tsExtractRefs({
            path: '/src/app.ts',
            content: 'const x = MyClass.create();\nconst y = new MyClass();\n',
            name: 'MyClass',
        });
        expect(result.refs.length).toBeGreaterThanOrEqual(2);
        expect(result.refs[0]).toMatchObject({ name: 'MyClass', kind: 'reference' });
    });

    it('skips declaration lines', async () => {
        const result = await tsExtractRefs({
            path: '/src/app.ts',
            content: 'class MyClass {}\nconst x = new MyClass();\n',
            name: 'MyClass',
        });
        expect(result.refs.every((r) => r.line === 2)).toBe(true);
    });

    it('finds PHP usages', async () => {
        const result = await tsExtractRefs({
            path: '/src/Service.php',
            content: "<?php\n$user = new UserService();\n$x = UserService::find(1);\n",
            name: 'UserService',
        });
        expect(result.refs.length).toBeGreaterThanOrEqual(2);
    });
});

describe('tsExtractCalls', () => {
    it('extracts caller→callee for TS functions', async () => {
        const result = await tsExtractCalls({
            path: '/src/app.ts',
            content: [
                'export function main(): void {',
                '    doWork();',
                '    helper();',
                '}',
                'export function doWork(): void {}',
                'export function helper(): void {}',
            ].join('\n'),
        });
        expect(result.calls.some((c) => c.caller === 'main' && c.callee === 'doWork')).toBe(true);
        expect(result.calls.some((c) => c.caller === 'main' && c.callee === 'helper')).toBe(true);
    });

    it('returns empty array for file with no function calls', async () => {
        const result = await tsExtractCalls({
            path: '/src/pure.ts',
            content: 'export const X = 42;\nexport const Y = "hello";\n',
        });
        expect(result.calls).toHaveLength(0);
    });

    it('handles PHP-style content (no crash)', async () => {
        const result = await tsExtractCalls({
            path: '/src/controller.php',
            content: "<?php\nfunction handle() {\n    $this->service->do();\n}\n",
        });
        expect(Array.isArray(result.calls)).toBe(true);
    });
});

describe('tsExtractOutline', () => {
    it('builds hierarchical outline for TS class', async () => {
        const result = await tsExtractOutline({
            path: '/src/service.ts',
            content: [
                'export class MyService {',
                '    doWork() {}',
                '    helper() {}',
                '}',
                'export function standalone(): void {}',
            ].join('\n'),
        });
        expect(result.outline.length).toBeGreaterThanOrEqual(1);
        const cls = result.outline.find((n) => n.name === 'MyService');
        expect(cls).toBeDefined();
        if (cls?.children) {
            expect(cls.children.some((c) => c.name === 'doWork')).toBe(true);
        }
    });

    it('returns flat outline for PHP (class + functions)', async () => {
        const result = await tsExtractOutline({
            path: '/src/controller.php',
            content: [
                '<?php',
                'class UserController {',
                '    public function index(): void {}',
                '}',
            ].join('\n'),
        });
        expect(result.outline.length).toBeGreaterThanOrEqual(1);
        const cls = result.outline.find((n) => n.name === 'UserController');
        expect(cls).toBeDefined();
    });

    it('returns flat list for Python module', async () => {
        const result = await tsExtractOutline({
            path: '/src/module.py',
            content: [
                'class DataService:',
                '    def process(self): pass',
                '',
                'def helper(): pass',
            ].join('\n'),
        });
        expect(result.outline.some((n) => n.name === 'DataService')).toBe(true);
    });
});

describe('treesitter brick', () => {
    it('registers 11 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(11);
        expect(bus.handle).toHaveBeenCalledWith('treesitter:index', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:reindex', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:status', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:cleanup', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:langs', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:extract-symbols', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:supported-exts', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:extract-imports', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:extract-refs', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:extract-calls', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('treesitter:extract-outline', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
