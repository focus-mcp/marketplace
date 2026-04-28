// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearBus,
    refsDeclaration,
    refsHierarchy,
    refsImplementations,
    refsReferences,
    setBus,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-refs-test-'));
    clearBus();
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    clearBus();
});

describe('refsReferences — fallback (no bus)', () => {
    it('finds TypeScript import references', async () => {
        await writeFile(join(testDir, 'a.ts'), `import { MySymbol } from './b.ts';\n`);
        const result = await refsReferences({ name: 'MySymbol', dir: testDir });
        expect(result.references).toHaveLength(1);
        expect(result.references[0]).toMatchObject({ kind: 'import', line: 1 });
    });

    it('finds TypeScript usage references', async () => {
        await writeFile(join(testDir, 'a.ts'), `const x = new MySymbol();\n`);
        const result = await refsReferences({ name: 'MySymbol', dir: testDir });
        expect(result.references).toHaveLength(1);
        expect(result.references[0]).toMatchObject({ kind: 'usage', line: 1 });
    });

    it('returns empty when not found', async () => {
        await writeFile(join(testDir, 'a.ts'), `const x = 1;\n`);
        const result = await refsReferences({ name: 'MySymbol', dir: testDir });
        expect(result.references).toHaveLength(0);
    });
});

describe('refsReferences — with bus', () => {
    it('uses treesitter:extract-refs when bus is available (TypeScript)', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                refs: [{ name: 'MyFn', line: 2, col: 4, kind: 'reference' }],
            }),
        };
        setBus(mockBus);
        await writeFile(join(testDir, 'a.ts'), 'function MyFn() {}\nconst r = MyFn();\n');
        const result = await refsReferences({ name: 'MyFn', dir: testDir });
        expect(result.references.length).toBeGreaterThanOrEqual(1);
        expect(mockBus.request).toHaveBeenCalledWith(
            'treesitter:extract-refs',
            expect.objectContaining({ name: 'MyFn' }),
        );
    });

    it('finds PHP symbol references via bus', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                refs: [{ name: 'myHelper', line: 3, col: 5, kind: 'reference' }],
            }),
        };
        setBus(mockBus);
        await writeFile(
            join(testDir, 'helper.php'),
            '<?php\nfunction myHelper() {}\n$r = myHelper();\n',
        );
        const result = await refsReferences({ name: 'myHelper', dir: testDir });
        expect(result.references.length).toBeGreaterThanOrEqual(1);
    });

    it('finds Python symbol references via bus', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                refs: [{ name: 'process', line: 3, col: 0, kind: 'reference' }],
            }),
        };
        setBus(mockBus);
        await writeFile(
            join(testDir, 'mod.py'),
            'def process(data):\n    return data\nresult = process(x)\n',
        );
        const result = await refsReferences({ name: 'process', dir: testDir });
        expect(result.references.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to text search if bus request fails', async () => {
        const mockBus = {
            request: vi.fn().mockRejectedValue(new Error('bus error')),
        };
        setBus(mockBus);
        await writeFile(join(testDir, 'a.ts'), 'const x = new MyClass();\n');
        const result = await refsReferences({ name: 'MyClass', dir: testDir });
        expect(result.references.length).toBeGreaterThanOrEqual(1);
    });
});

describe('refsImplementations', () => {
    it('finds TypeScript class implements', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Foo implements MyInterface {}\n`);
        const result = await refsImplementations({ name: 'MyInterface', dir: testDir });
        expect(result.implementations).toHaveLength(1);
        expect(result.implementations[0]?.line).toBe(1);
    });

    it('finds TypeScript class extends', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Bar extends MyBase {}\n`);
        const result = await refsImplementations({ name: 'MyBase', dir: testDir });
        expect(result.implementations).toHaveLength(1);
    });

    it('finds PHP class extends pattern', async () => {
        await writeFile(
            join(testDir, 'Controller.php'),
            '<?php\nclass UserController extends BaseController {}\n',
        );
        const result = await refsImplementations({ name: 'BaseController', dir: testDir });
        expect(result.implementations).toHaveLength(1);
    });

    it('returns empty when none found', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Baz {}\n`);
        const result = await refsImplementations({ name: 'MyInterface', dir: testDir });
        expect(result.implementations).toHaveLength(0);
    });
});

describe('refsDeclaration — fallback (no bus)', () => {
    it('finds TypeScript function declaration', async () => {
        await writeFile(join(testDir, 'a.ts'), `export function myFunc() {}\n`);
        const result = await refsDeclaration({ name: 'myFunc', dir: testDir });
        expect(result.declaration).not.toBeNull();
        expect(result.declaration?.kind).toBe('function');
        expect(result.declaration?.line).toBe(1);
    });

    it('finds TypeScript class declaration', async () => {
        await writeFile(join(testDir, 'a.ts'), `export class MyClass {}\n`);
        const result = await refsDeclaration({ name: 'MyClass', dir: testDir });
        expect(result.declaration?.kind).toBe('class');
    });

    it('finds TypeScript interface declaration', async () => {
        await writeFile(join(testDir, 'a.ts'), `export interface IFoo {}\n`);
        const result = await refsDeclaration({ name: 'IFoo', dir: testDir });
        expect(result.declaration?.kind).toBe('interface');
    });

    it('returns null when not found', async () => {
        await writeFile(join(testDir, 'a.ts'), `const x = 1;\n`);
        const result = await refsDeclaration({ name: 'unknown', dir: testDir });
        expect(result.declaration).toBeNull();
    });
});

describe('refsDeclaration — with bus', () => {
    it('uses treesitter:extract-symbols for TS declarations', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                symbols: [
                    {
                        name: 'myFunc',
                        kind: 'function',
                        file: '/test.ts',
                        line: 1,
                        endLine: 1,
                        signature: 'export function myFunc(): void',
                        exported: true,
                    },
                ],
                imports: [],
                exports: ['myFunc'],
            }),
        };
        setBus(mockBus);
        await writeFile(join(testDir, 'a.ts'), 'export function myFunc(): void {}\n');
        const result = await refsDeclaration({ name: 'myFunc', dir: testDir });
        expect(result.declaration).not.toBeNull();
        expect(result.declaration?.kind).toBe('function');
        expect(mockBus.request).toHaveBeenCalledWith(
            'treesitter:extract-symbols',
            expect.any(Object),
        );
    });

    it('finds PHP class declaration via bus', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                symbols: [
                    {
                        name: 'UserController',
                        kind: 'class',
                        file: '/Controller.php',
                        line: 2,
                        endLine: 10,
                        signature: 'class UserController',
                        exported: true,
                    },
                ],
                imports: [],
                exports: [],
            }),
        };
        setBus(mockBus);
        await writeFile(join(testDir, 'Controller.php'), '<?php\nclass UserController {}\n');
        const result = await refsDeclaration({ name: 'UserController', dir: testDir });
        expect(result.declaration).not.toBeNull();
        expect(result.declaration?.kind).toBe('class');
    });

    it('finds Python function declaration via bus', async () => {
        const mockBus = {
            request: vi.fn().mockResolvedValue({
                symbols: [
                    {
                        name: 'process_data',
                        kind: 'function',
                        file: '/service.py',
                        line: 1,
                        endLine: 3,
                        signature: 'def process_data(data)',
                        exported: false,
                    },
                ],
                imports: [],
                exports: [],
            }),
        };
        setBus(mockBus);
        await writeFile(join(testDir, 'service.py'), 'def process_data(data):\n    return data\n');
        const result = await refsDeclaration({ name: 'process_data', dir: testDir });
        expect(result.declaration).not.toBeNull();
    });
});

describe('refsHierarchy', () => {
    it('finds TypeScript parent class', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Child extends MyClass {}\n`);
        const result = await refsHierarchy({ name: 'Child', dir: testDir });
        expect(result.parents).toContain('MyClass');
    });

    it('finds TypeScript child classes', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Child extends MyClass {}\n`);
        const result = await refsHierarchy({ name: 'MyClass', dir: testDir });
        expect(result.children).toContain('Child');
    });

    it('finds PHP class hierarchy', async () => {
        await writeFile(
            join(testDir, 'Controller.php'),
            '<?php\nclass UserController extends BaseController {}\n',
        );
        const result = await refsHierarchy({ name: 'BaseController', dir: testDir });
        expect(result.children).toContain('UserController');
    });

    it('returns empty arrays when no hierarchy', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Standalone {}\n`);
        const result = await refsHierarchy({ name: 'Standalone', dir: testDir });
        expect(result.parents).toHaveLength(0);
        expect(result.children).toHaveLength(0);
    });
});

describe('refs brick', () => {
    it('registers 4 handlers on start, injects bus, unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const mockBus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(),
        };

        await brick.start({ bus: mockBus });
        expect(mockBus.handle).toHaveBeenCalledTimes(4);
        expect(mockBus.handle).toHaveBeenCalledWith('refs:references', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('refs:implementations', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('refs:declaration', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('refs:hierarchy', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
