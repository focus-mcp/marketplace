// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rshMultisource, rshSynthesize, rshValidate } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-research-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── rshMultisource ──────────────────────────────────────────────────────────

describe('rshMultisource', () => {
    it('extracts exports from a file', async () => {
        const p = await makeFile(
            'util.ts',
            [
                'export function greet() {}',
                'export const PI = 3.14;',
                'export type Greeting = string;',
            ].join('\n'),
        );

        const result = await rshMultisource({ paths: [p] });
        expect(result.sources).toHaveLength(1);
        const src = result.sources[0];
        expect(src?.exports).toContain('greet');
        expect(src?.exports).toContain('PI');
    });

    it('extracts imports from a file', async () => {
        const p = await makeFile(
            'main.ts',
            ["import { greet } from './util';", "import path from 'node:path';"].join('\n'),
        );

        const result = await rshMultisource({ paths: [p] });
        const src = result.sources[0];
        expect(src?.imports).toContain('./util');
        expect(src?.imports).toContain('node:path');
    });

    it('extracts types and interfaces', async () => {
        const p = await makeFile(
            'types.ts',
            ['export interface User { name: string; }', 'export type ID = string;'].join('\n'),
        );

        const result = await rshMultisource({ paths: [p] });
        const src = result.sources[0];
        expect(src?.types).toContain('User');
        expect(src?.types).toContain('ID');
    });

    it('extracts function signatures', async () => {
        const p = await makeFile(
            'fns.ts',
            [
                'export function doSomething() {}',
                'export async function fetchData() {}',
                'export const process = (x: number) => x * 2;',
            ].join('\n'),
        );

        const result = await rshMultisource({ paths: [p] });
        const src = result.sources[0];
        expect(src?.functions).toContain('doSomething');
        expect(src?.functions).toContain('fetchData');
    });

    it('returns empty arrays for non-existent file', async () => {
        const result = await rshMultisource({ paths: ['/non/existent/file.ts'] });
        expect(result.sources).toHaveLength(1);
        const src = result.sources[0];
        expect(src?.exports).toHaveLength(0);
        expect(src?.imports).toHaveLength(0);
    });

    it('handles multiple files', async () => {
        const a = await makeFile('a.ts', 'export const A = 1;');
        const b = await makeFile('b.ts', 'export const B = 2;');

        const result = await rshMultisource({ paths: [a, b] });
        expect(result.sources).toHaveLength(2);
    });
});

// ─── rshSynthesize ───────────────────────────────────────────────────────────

describe('rshSynthesize', () => {
    it('finds shared types across sources', () => {
        const sources = [
            { path: '/a.ts', exports: [], imports: [], types: ['User', 'Config'], functions: [] },
            { path: '/b.ts', exports: [], imports: [], types: ['User', 'Response'], functions: [] },
        ];

        const result = rshSynthesize({ sources });
        expect(result.sharedTypes).toContain('User');
        expect(result.sharedTypes).not.toContain('Config');
        expect(result.sharedTypes).not.toContain('Response');
    });

    it('finds common dependencies', () => {
        const sources = [
            {
                path: '/a.ts',
                exports: [],
                imports: ['node:path', 'node:fs'],
                types: [],
                functions: [],
            },
            {
                path: '/b.ts',
                exports: [],
                imports: ['node:path', 'vitest'],
                types: [],
                functions: [],
            },
        ];

        const result = rshSynthesize({ sources });
        expect(result.commonDeps).toContain('node:path');
        expect(result.commonDeps).not.toContain('node:fs');
    });

    it('computes API surface from all exports', () => {
        const sources = [
            { path: '/a.ts', exports: ['foo', 'bar'], imports: [], types: [], functions: [] },
            { path: '/b.ts', exports: ['baz'], imports: [], types: [], functions: [] },
        ];

        const result = rshSynthesize({ sources });
        expect(result.apiSurface).toContain('foo');
        expect(result.apiSurface).toContain('bar');
        expect(result.apiSurface).toContain('baz');
    });

    it('detects connections between files via relative imports', async () => {
        const utilPath = join(testDir, 'util.ts');
        const mainPath = join(testDir, 'main.ts');
        await writeFile(utilPath, 'export const x = 1;');
        await writeFile(mainPath, "import { x } from './util';");

        const result = await rshMultisource({ paths: [utilPath, mainPath] });
        const synth = rshSynthesize({ sources: result.sources });

        expect(synth.connections.some((c) => c.from === mainPath && c.to === utilPath)).toBe(true);
    });

    it('returns empty when no sources', () => {
        const result = rshSynthesize({ sources: [] });
        expect(result.sharedTypes).toHaveLength(0);
        expect(result.commonDeps).toHaveLength(0);
        expect(result.apiSurface).toHaveLength(0);
        expect(result.connections).toHaveLength(0);
    });
});

// ─── rshValidate ─────────────────────────────────────────────────────────────

describe('rshValidate', () => {
    it('returns valid when all imports resolve', async () => {
        const utilPath = join(testDir, 'util.ts');
        const mainPath = join(testDir, 'main.ts');
        await writeFile(utilPath, 'export const x = 1;');
        await writeFile(mainPath, "import { x } from './util';");

        const { sources } = await rshMultisource({ paths: [utilPath, mainPath] });
        const result = rshValidate({ sources });

        const missingDeps = result.issues.filter((i) => i.type === 'missing-dep');
        expect(missingDeps).toHaveLength(0);
    });

    it('detects unresolved relative imports', () => {
        const sources = [
            {
                path: '/a.ts',
                exports: [],
                imports: ['./missing-module'],
                types: [],
                functions: [],
            },
        ];

        const result = rshValidate({ sources });
        expect(result.valid).toBe(false);
        expect(result.issues.some((i) => i.type === 'missing-dep')).toBe(true);
    });

    it('detects circular references', () => {
        const sources = [
            { path: `${testDir}/a.ts`, exports: ['a'], imports: [`./b`], types: [], functions: [] },
            { path: `${testDir}/b.ts`, exports: ['b'], imports: [`./a`], types: [], functions: [] },
        ];

        const result = rshValidate({ sources });
        expect(result.issues.some((i) => i.type === 'circular-ref')).toBe(true);
        expect(result.valid).toBe(false);
    });

    it('detects duplicate exports', () => {
        const sources = [
            { path: '/a.ts', exports: ['sharedName'], imports: [], types: [], functions: [] },
            { path: '/b.ts', exports: ['sharedName'], imports: [], types: [], functions: [] },
        ];

        const result = rshValidate({ sources });
        expect(
            result.issues.some(
                (i) => i.type === 'undefined-type' && i.message.includes('sharedName'),
            ),
        ).toBe(true);
        expect(result.valid).toBe(false);
    });

    it('returns valid:true for clean sources', () => {
        const sources = [
            {
                path: '/a.ts',
                exports: ['alpha'],
                imports: ['node:path'],
                types: ['Alpha'],
                functions: ['alpha'],
            },
            {
                path: '/b.ts',
                exports: ['beta'],
                imports: ['node:fs'],
                types: ['Beta'],
                functions: ['beta'],
            },
        ];

        const result = rshValidate({ sources });
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
    });
});

// ─── research brick ──────────────────────────────────────────────────────────

describe('research brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('research:multisource', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('research:synthesize', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('research:validate', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
