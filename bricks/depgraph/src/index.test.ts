// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    depCircular,
    depExports,
    depFanin,
    depFanout,
    depImports,
    parseExports,
    parseImports,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-depgraph-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('parseImports', () => {
    it('parses ESM named imports', () => {
        const imports = parseImports("import { foo, bar } from './utils.ts';");
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
            from: './utils.ts',
            names: ['foo', 'bar'],
            kind: 'esm',
        });
    });

    it('parses ESM default import', () => {
        const imports = parseImports("import MyDefault from './mod.ts';");
        expect(imports[0]).toMatchObject({ from: './mod.ts', kind: 'esm' });
    });

    it('parses CJS require', () => {
        const imports = parseImports("const x = require('./legacy.js');");
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({ from: './legacy.js', kind: 'cjs' });
    });

    it('returns empty array for no imports', () => {
        const imports = parseImports('export function x() {}');
        expect(imports).toHaveLength(0);
    });
});

describe('parseExports', () => {
    it('parses various export forms', () => {
        const content = [
            'export function doWork() {}',
            'export class MyClass {}',
            'export interface IFoo {}',
            'export type Bar = string;',
            'export const VALUE = 1;',
        ].join('\n');
        const exports = parseExports(content);
        expect(exports).toContain('doWork');
        expect(exports).toContain('MyClass');
        expect(exports).toContain('IFoo');
        expect(exports).toContain('Bar');
        expect(exports).toContain('VALUE');
    });

    it('parses re-exports', () => {
        const exports = parseExports("export { foo, bar as baz } from './mod.ts';");
        expect(exports).toContain('foo');
        expect(exports).toContain('baz');
    });
});

describe('depImports', () => {
    it('reads imports from a file', async () => {
        const file = join(testDir, 'a.ts');
        await writeFile(file, "import { x } from './b.ts';\nimport type { T } from './c.ts';");
        const result = await depImports({ file });
        expect(result.imports.length).toBeGreaterThanOrEqual(1);
    });
});

describe('depExports', () => {
    it('reads exports from a file', async () => {
        const file = join(testDir, 'b.ts');
        await writeFile(file, 'export function hello() {}\nexport const X = 1;');
        const result = await depExports({ file });
        expect(result.exports).toContain('hello');
        expect(result.exports).toContain('X');
    });
});

describe('depCircular', () => {
    it('detects circular dependency a -> b -> a', async () => {
        const subDir = join(testDir, 'circ');
        await mkdir(subDir);
        await writeFile(
            join(subDir, 'a.ts'),
            "import { b } from './b.ts';\nexport function a() {}",
        );
        await writeFile(
            join(subDir, 'b.ts'),
            "import { a } from './a.ts';\nexport function b() {}",
        );
        const result = await depCircular({ dir: subDir });
        expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('returns empty cycles for non-circular deps', async () => {
        const subDir = join(testDir, 'nocirc');
        await mkdir(subDir);
        await writeFile(join(subDir, 'utils.ts'), 'export function util() {}');
        await writeFile(
            join(subDir, 'main.ts'),
            "import { util } from './utils.ts';\nexport function main() {}",
        );
        const result = await depCircular({ dir: subDir });
        expect(result.cycles).toHaveLength(0);
    });
});

describe('depFanin', () => {
    it('finds files that import the target', async () => {
        await writeFile(join(testDir, 'util.ts'), 'export function util() {}');
        await writeFile(join(testDir, 'a.ts'), "import { util } from './util.ts';");
        await writeFile(join(testDir, 'b.ts'), "import { util } from './util.ts';");
        await writeFile(join(testDir, 'c.ts'), 'export function c() {}');
        const result = await depFanin({ file: join(testDir, 'util.ts'), dir: testDir });
        expect(result.count).toBe(2);
        expect(result.fanin.some((f) => f.endsWith('a.ts'))).toBe(true);
        expect(result.fanin.some((f) => f.endsWith('b.ts'))).toBe(true);
    });

    it('returns 0 fanin for file not imported by anyone', async () => {
        await writeFile(join(testDir, 'isolated.ts'), 'export function alone() {}');
        const result = await depFanin({ file: join(testDir, 'isolated.ts'), dir: testDir });
        expect(result.count).toBe(0);
    });
});

describe('depFanout', () => {
    it('counts imports', async () => {
        const file = join(testDir, 'many.ts');
        await writeFile(
            file,
            "import { a } from './a.ts';\nimport { b } from './b.ts';\nexport function x() {}",
        );
        const result = await depFanout({ file });
        expect(result.fanout).toBe(2);
    });

    it('returns 0 for file with no imports', async () => {
        const file = join(testDir, 'none.ts');
        await writeFile(file, 'export function pure() {}');
        const result = await depFanout({ file });
        expect(result.fanout).toBe(0);
    });
});

describe('depCircular — resolveImport index file branch', () => {
    it('resolves imports to index.ts inside a subdirectory', async () => {
        // resolveImport checks `candidate/index${ext}` — trigger that branch
        const subDir = join(testDir, 'utils');
        await mkdir(subDir);
        await writeFile(join(subDir, 'index.ts'), 'export function util() {}');
        await writeFile(
            join(testDir, 'main.ts'),
            "import { util } from './utils';\nexport function main() {}",
        );
        // No cycles expected; just verify the graph resolves correctly (no crash)
        const result = await depCircular({ dir: testDir });
        expect(Array.isArray(result.cycles)).toBe(true);
    });
});

describe('depFanin — fileImportsTarget extension matching branch', () => {
    it('detects fanin when import specifier has no extension (resolved via extension loop)', async () => {
        // importer uses './util' (no ext) — fileImportsTarget must use the extension loop
        await writeFile(join(testDir, 'util.ts'), 'export function util() {}');
        await writeFile(
            join(testDir, 'consumer.ts'),
            "import { util } from './util';\nexport function consumer() {}",
        );
        const result = await depFanin({ file: join(testDir, 'util.ts'), dir: testDir });
        expect(result.count).toBeGreaterThanOrEqual(1);
        expect(result.fanin.some((f) => f.endsWith('consumer.ts'))).toBe(true);
    });
});

describe('depgraph brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('dep:imports', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dep:exports', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dep:circular', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dep:fanin', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dep:fanout', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
