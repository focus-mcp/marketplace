// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { outlineFile, outlineRepo, outlineStructure } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-outline-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('outlineFile', () => {
    it('extracts exported functions', async () => {
        const file = join(testDir, 'a.ts');
        await writeFile(file, `export function foo() {}\nexport async function bar() {}\n`);
        const result = await outlineFile({ path: file });
        expect(result.symbols).toHaveLength(2);
        expect(result.symbols[0]).toMatchObject({ name: 'foo', kind: 'function', exported: true });
        expect(result.symbols[1]).toMatchObject({ name: 'bar', kind: 'function', exported: true });
        expect(result.lineCount).toBe(3);
    });

    it('extracts exported classes', async () => {
        const file = join(testDir, 'b.ts');
        await writeFile(file, `export class Foo {}\n`);
        const result = await outlineFile({ path: file });
        expect(result.symbols[0]).toMatchObject({ name: 'Foo', kind: 'class', exported: true });
    });

    it('extracts exported interfaces', async () => {
        const file = join(testDir, 'c.ts');
        await writeFile(file, `export interface Bar {}\n`);
        const result = await outlineFile({ path: file });
        expect(result.symbols[0]).toMatchObject({ name: 'Bar', kind: 'interface', exported: true });
    });

    it('extracts exported types', async () => {
        const file = join(testDir, 'd.ts');
        await writeFile(file, `export type Baz = string;\n`);
        const result = await outlineFile({ path: file });
        expect(result.symbols[0]).toMatchObject({ name: 'Baz', kind: 'type', exported: true });
    });

    it('extracts exported consts', async () => {
        const file = join(testDir, 'e.ts');
        await writeFile(file, `export const MY_CONST = 42;\n`);
        const result = await outlineFile({ path: file });
        expect(result.symbols[0]).toMatchObject({
            name: 'MY_CONST',
            kind: 'variable',
            exported: true,
        });
    });

    it('extracts imports', async () => {
        const file = join(testDir, 'f.ts');
        await writeFile(file, `import { foo, bar } from './util.ts';\n`);
        const result = await outlineFile({ path: file });
        expect(result.imports).toHaveLength(1);
        expect(result.imports[0]).toMatchObject({ from: './util.ts', names: ['foo', 'bar'] });
    });

    it('throws on missing file', async () => {
        await expect(outlineFile({ path: join(testDir, 'nope.ts') })).rejects.toThrow();
    });
});

describe('outlineRepo', () => {
    it('returns per-file summary', async () => {
        const srcDir = join(testDir, 'src');
        await mkdir(srcDir);
        await writeFile(join(srcDir, 'a.ts'), `export function hello() {}\n`);
        await writeFile(join(srcDir, 'b.ts'), `export const x = 1;\n`);

        const result = await outlineRepo({ dir: testDir });
        expect(result.totalFiles).toBe(2);
        expect(result.totalSymbols).toBe(2);
        expect(result.files.length).toBe(2);
    });

    it('respects maxFiles limit', async () => {
        await writeFile(join(testDir, 'a.ts'), `export function a() {}\n`);
        await writeFile(join(testDir, 'b.ts'), `export function b() {}\n`);
        await writeFile(join(testDir, 'c.ts'), `export function c() {}\n`);

        const result = await outlineRepo({ dir: testDir, maxFiles: 2 });
        expect(result.totalFiles).toBeLessThanOrEqual(2);
    });

    it('skips node_modules', async () => {
        const nmDir = join(testDir, 'node_modules');
        await mkdir(nmDir);
        await writeFile(join(nmDir, 'a.ts'), `export function a() {}\n`);
        await writeFile(join(testDir, 'b.ts'), `export function b() {}\n`);

        const result = await outlineRepo({ dir: testDir });
        expect(result.totalFiles).toBe(1);
    });
});

describe('outlineStructure', () => {
    it('returns directory tree', async () => {
        const sub = join(testDir, 'src');
        await mkdir(sub);
        await writeFile(join(sub, 'a.ts'), '');
        await writeFile(join(testDir, 'b.json'), '');

        const result = await outlineStructure({ dir: testDir });
        expect(result.tree.length).toBeGreaterThan(0);
        const srcEntry = result.tree.find((e) => e.path === 'src');
        expect(srcEntry).toBeDefined();
        expect(srcEntry?.files).toBe(1);
    });

    it('respects maxDepth', async () => {
        const deep = join(testDir, 'a', 'b', 'c', 'd');
        await mkdir(deep, { recursive: true });
        await writeFile(join(deep, 'x.ts'), '');

        const result = await outlineStructure({ dir: testDir, maxDepth: 2 });
        const paths = result.tree.map((e) => e.path);
        expect(paths.every((p) => p.split('/').length <= 2)).toBe(true);
    });

    it('ignores node_modules', async () => {
        const nm = join(testDir, 'node_modules', 'foo');
        await mkdir(nm, { recursive: true });
        await writeFile(join(nm, 'x.ts'), '');

        const result = await outlineStructure({ dir: testDir });
        const paths = result.tree.map((e) => e.path);
        expect(paths.every((p) => !p.includes('node_modules'))).toBe(true);
    });
});

describe('outline brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('outline:file', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('outline:repo', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('outline:structure', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
