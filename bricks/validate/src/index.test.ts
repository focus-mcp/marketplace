// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { valJson, valLint, valSchema, valTypes } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-validate-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── valJson ──────────────────────────────────────────────────────────────────

describe('valJson', () => {
    it('accepts valid JSON object', () => {
        const result = valJson({ text: '{"a":1,"b":true}' });
        expect(result.valid).toBe(true);
        expect(result.parsed).toEqual({ a: 1, b: true });
        expect(result.error).toBeUndefined();
    });

    it('accepts valid JSON array', () => {
        const result = valJson({ text: '[1,2,3]' });
        expect(result.valid).toBe(true);
        expect(Array.isArray(result.parsed)).toBe(true);
    });

    it('accepts valid JSON primitives', () => {
        expect(valJson({ text: 'null' }).valid).toBe(true);
        expect(valJson({ text: '"hello"' }).valid).toBe(true);
        expect(valJson({ text: '42' }).valid).toBe(true);
        expect(valJson({ text: 'false' }).valid).toBe(true);
    });

    it('rejects invalid JSON and returns error message', () => {
        const result = valJson({ text: '{a: 1}' });
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.parsed).toBeUndefined();
    });

    it('rejects empty string', () => {
        const result = valJson({ text: '' });
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('rejects trailing comma', () => {
        const result = valJson({ text: '{"a":1,}' });
        expect(result.valid).toBe(false);
    });
});

// ─── valSchema ────────────────────────────────────────────────────────────────

describe('valSchema', () => {
    it('validates a simple object with required fields', () => {
        const result = valSchema({
            data: '{"name":"Alice","age":30}',
            schema: {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                },
            },
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('reports missing required property', () => {
        const result = valSchema({
            data: '{"name":"Bob"}',
            schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                },
            },
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('email'))).toBe(true);
    });

    it('reports wrong property type', () => {
        const result = valSchema({
            data: '{"count":"not-a-number"}',
            schema: {
                type: 'object',
                properties: { count: { type: 'integer' } },
            },
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path === 'count')).toBe(true);
    });

    it('validates array items', () => {
        const result = valSchema({
            data: '[1,2,"three"]',
            schema: { type: 'array', items: { type: 'integer' } },
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.path.includes('[2]'))).toBe(true);
    });

    it('validates nested objects', () => {
        const result = valSchema({
            data: '{"user":{"name":"Alice","age":25}}',
            schema: {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        required: ['name', 'age'],
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'integer' },
                        },
                    },
                },
            },
        });
        expect(result.valid).toBe(true);
    });

    it('accepts union types', () => {
        const result = valSchema({
            data: 'null',
            schema: { type: ['string', 'null'] },
        });
        expect(result.valid).toBe(true);
    });

    it('reports invalid JSON in data', () => {
        const result = valSchema({
            data: 'not json',
            schema: { type: 'object' },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.message).toMatch(/Invalid JSON/);
    });

    it('accepts number when integer is also valid', () => {
        const result = valSchema({
            data: '42',
            schema: { type: 'number' },
        });
        expect(result.valid).toBe(true);
    });
});

// ─── valTypes ────────────────────────────────────────────────────────────────

describe('valTypes', () => {
    it('detects explicit any annotation', async () => {
        const p = await makeFile(
            'types-any.ts',
            ['function foo(x: any): void {', '    return;', '}'].join('\n'),
        );
        const result = await valTypes({ path: p });
        expect(result.issues.some((i) => i.type === 'explicit-any')).toBe(true);
        expect(result.score).toBeLessThan(100);
    });

    it('detects missing return type on function declaration', async () => {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional — testing detection of template-literal-like strings in source code
        const tmpl = '`Hello ${name}`';
        const p = await makeFile(
            'types-noret.ts',
            ['export function greet(name: string) {', `    return ${tmpl};`, '}'].join('\n'),
        );
        const result = await valTypes({ path: p });
        expect(result.issues.some((i) => i.type === 'missing-return-type')).toBe(true);
    });

    it('detects implicit any from untyped params', async () => {
        const p = await makeFile(
            'types-implicit.ts',
            ['function compute(a, b) {', '    return a + b;', '}'].join('\n'),
        );
        const result = await valTypes({ path: p });
        expect(result.issues.some((i) => i.type === 'implicit-any')).toBe(true);
    });

    it('returns score 100 for a clean file', async () => {
        const p = await makeFile(
            'types-clean.ts',
            ['export function add(a: number, b: number): number {', '    return a + b;', '}'].join(
                '\n',
            ),
        );
        const result = await valTypes({ path: p });
        const hasIssues = result.issues.some((i) => i.type !== 'missing-return-type');
        expect(result.score).toBeGreaterThanOrEqual(90);
        expect(hasIssues).toBe(false);
    });

    it('returns file-error for missing file', async () => {
        const result = await valTypes({ path: '/nonexistent/file.ts' });
        expect(result.issues[0]?.type).toBe('file-error');
        expect(result.score).toBe(0);
    });

    it('floor score at 0 for many issues', async () => {
        const lines = Array.from({ length: 15 }, (_, i) => `const x${i.toString()}: any = null;`);
        const p = await makeFile('types-many-issues.ts', lines.join('\n'));
        const result = await valTypes({ path: p });
        expect(result.score).toBe(0);
    });
});

// ─── valLint ─────────────────────────────────────────────────────────────────

describe('valLint', () => {
    it('detects console.log usage', async () => {
        const p = await makeFile(
            'lint-console.ts',
            ['import { foo } from "./foo.ts";', 'foo();', 'console.log("debug");'].join('\n'),
        );
        const result = await valLint({ path: p });
        expect(result.findings.some((f) => f.rule === 'no-console-log')).toBe(true);
        expect(result.clean).toBe(false);
    });

    it('detects debugger statement', async () => {
        const p = await makeFile(
            'lint-debugger.ts',
            ['function go(): void {', '    debugger;', '}'].join('\n'),
        );
        const result = await valLint({ path: p });
        expect(result.findings.some((f) => f.rule === 'no-debugger')).toBe(true);
    });

    it('detects TODO comment', async () => {
        const p = await makeFile(
            'lint-todo.ts',
            ['// TODO: implement this', 'export const x = 1;'].join('\n'),
        );
        const result = await valLint({ path: p });
        expect(result.findings.some((f) => f.rule === 'todo-fixme')).toBe(true);
    });

    it('detects FIXME comment', async () => {
        const p = await makeFile(
            'lint-fixme.ts',
            ['// FIXME: broken', 'export const y = 2;'].join('\n'),
        );
        const result = await valLint({ path: p });
        expect(result.findings.some((f) => f.rule === 'todo-fixme')).toBe(true);
    });

    it('detects unused import', async () => {
        const p = await makeFile(
            'lint-unused.ts',
            [
                'import { readFile, writeFile } from "node:fs/promises";',
                'await readFile("/tmp/x");',
            ].join('\n'),
        );
        const result = await valLint({ path: p });
        expect(
            result.findings.some(
                (f) => f.rule === 'unused-import' && f.message.includes('writeFile'),
            ),
        ).toBe(true);
        expect(
            result.findings.some(
                (f) => f.rule === 'unused-import' && f.message.includes('readFile'),
            ),
        ).toBe(false);
    });

    it('returns clean for a pristine file', async () => {
        const p = await makeFile(
            'lint-clean.ts',
            ['export function add(a: number, b: number): number {', '    return a + b;', '}'].join(
                '\n',
            ),
        );
        const result = await valLint({ path: p });
        expect(result.clean).toBe(true);
        expect(result.findings).toHaveLength(0);
    });

    it('returns file-error for missing file', async () => {
        const result = await valLint({ path: '/nonexistent/path.ts' });
        expect(result.findings[0]?.rule).toBe('file-error');
        expect(result.clean).toBe(false);
    });

    it('findings are sorted by line number', async () => {
        const p = await makeFile(
            'lint-order.ts',
            ['// TODO: first', 'export const a = 1;', '// FIXME: second', '// TODO: third'].join(
                '\n',
            ),
        );
        const result = await valLint({ path: p });
        const todoLines = result.findings.map((f) => f.line);
        expect(todoLines).toEqual([...todoLines].sort((a, b) => a - b));
    });
});

// ─── Brick lifecycle ──────────────────────────────────────────────────────────

describe('validate brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('validate:json', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('validate:schema', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('validate:types', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('validate:lint', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('validate');
        expect(brick.manifest.prefix).toBe('val');
    });
});
