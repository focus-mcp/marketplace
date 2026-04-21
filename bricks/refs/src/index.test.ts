// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    refsDeclaration,
    refsHierarchy,
    refsImplementations,
    refsReferences,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-refs-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

describe('refsReferences', () => {
    it('finds import references', async () => {
        await writeFile(join(testDir, 'a.ts'), `import { MySymbol } from './b.ts';\n`);
        const result = await refsReferences({ name: 'MySymbol', dir: testDir });
        expect(result.references).toHaveLength(1);
        expect(result.references[0]).toMatchObject({ kind: 'import', line: 1 });
    });

    it('finds usage references', async () => {
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

describe('refsImplementations', () => {
    it('finds class implements', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Foo implements MyInterface {}\n`);
        const result = await refsImplementations({ name: 'MyInterface', dir: testDir });
        expect(result.implementations).toHaveLength(1);
        expect(result.implementations[0]?.line).toBe(1);
    });

    it('finds class extends', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Bar extends MyBase {}\n`);
        const result = await refsImplementations({ name: 'MyBase', dir: testDir });
        expect(result.implementations).toHaveLength(1);
    });

    it('returns empty when none found', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Baz {}\n`);
        const result = await refsImplementations({ name: 'MyInterface', dir: testDir });
        expect(result.implementations).toHaveLength(0);
    });
});

describe('refsDeclaration', () => {
    it('finds function declaration', async () => {
        await writeFile(join(testDir, 'a.ts'), `export function myFunc() {}\n`);
        const result = await refsDeclaration({ name: 'myFunc', dir: testDir });
        expect(result.declaration).not.toBeNull();
        expect(result.declaration?.kind).toBe('function');
        expect(result.declaration?.line).toBe(1);
    });

    it('finds class declaration', async () => {
        await writeFile(join(testDir, 'a.ts'), `export class MyClass {}\n`);
        const result = await refsDeclaration({ name: 'MyClass', dir: testDir });
        expect(result.declaration?.kind).toBe('class');
    });

    it('finds interface declaration', async () => {
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

describe('refsHierarchy', () => {
    it('finds parent class', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Child extends MyClass {}\n`);
        const result = await refsHierarchy({ name: 'Child', dir: testDir });
        expect(result.parents).toContain('MyClass');
    });

    it('finds child classes', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Child extends MyClass {}\n`);
        const result = await refsHierarchy({ name: 'MyClass', dir: testDir });
        expect(result.children).toContain('Child');
    });

    it('returns empty arrays when no hierarchy', async () => {
        await writeFile(join(testDir, 'a.ts'), `class Standalone {}\n`);
        const result = await refsHierarchy({ name: 'Standalone', dir: testDir });
        expect(result.parents).toHaveLength(0);
        expect(result.children).toHaveLength(0);
    });
});

describe('refs brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('refs:references', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('refs:implementations', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('refs:declaration', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('refs:hierarchy', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
