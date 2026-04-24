// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boxEval, boxFile, boxLanguages, boxRead, boxRun } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-sandbox-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── boxRun ──────────────────────────────────────────────────────────────────

describe('boxRun', () => {
    it('executes simple math and returns result', async () => {
        const out = await boxRun({ code: '1 + 2' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('3');
        expect(out.duration).toBeGreaterThanOrEqual(0);
    });

    it('captures console.log output', async () => {
        const out = await boxRun({ code: 'console.log("hello", "world"); 42' });
        expect(out.error).toBeUndefined();
        expect(out.logs).toContain('hello world');
        expect(out.result).toBe('42');
    });

    it('captures console.error output', async () => {
        const out = await boxRun({ code: 'console.error("oops")' });
        expect(out.logs).toContain('[error] oops');
    });

    it('captures console.warn output', async () => {
        const out = await boxRun({ code: 'console.warn("careful")' });
        expect(out.logs).toContain('[warn] careful');
    });

    it('returns error on timeout', async () => {
        const out = await boxRun({ code: 'while(true){}', timeout: 50 });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/timed? ?out|Script execution timed out/i);
    });

    it('returns error on syntax/runtime error', async () => {
        const out = await boxRun({ code: 'throw new Error("boom")' });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/boom/);
    });

    it('returns "undefined" result for void code', async () => {
        const out = await boxRun({ code: 'const x = 1;' });
        expect(out.result).toBe('undefined');
    });

    it('process is NOT available in sandbox', async () => {
        const out = await boxRun({ code: 'typeof process' });
        expect(out.result).toBe('"undefined"');
    });

    it('require is NOT available in sandbox', async () => {
        const out = await boxRun({ code: 'typeof require' });
        expect(out.result).toBe('"undefined"');
    });

    it('__dirname is NOT available in sandbox', async () => {
        const out = await boxRun({ code: 'typeof __dirname' });
        expect(out.result).toBe('"undefined"');
    });

    it('global is NOT available in sandbox', async () => {
        const out = await boxRun({ code: 'typeof global' });
        expect(out.result).toBe('"undefined"');
    });

    it('can use JSON in sandbox', async () => {
        const out = await boxRun({ code: 'JSON.stringify({ a: 1 })' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('"{\\"a\\":1}"');
    });

    it('can use Math in sandbox', async () => {
        const out = await boxRun({ code: 'Math.max(1, 2, 3)' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('3');
    });

    it('can use Array in sandbox', async () => {
        const out = await boxRun({ code: '[1, 2, 3].map(x => x * 2)' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('[2,4,6]');
    });

    it('transpiles and runs TypeScript code', async () => {
        const out = await boxRun({ code: 'const x: number = 21; x * 2' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('42');
    });

    it('transpiles TypeScript with interface declaration', async () => {
        const out = await boxRun({
            code: 'interface Foo { val: number } const f: Foo = { val: 7 }; f.val',
        });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('7');
    });

    it('forces TS transpile when isTs flag is set', async () => {
        const out = await boxRun({ code: 'const n: number = 3; n + 1', isTs: true });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('4');
    });
});

// ─── boxFile ─────────────────────────────────────────────────────────────────

describe('boxFile', () => {
    it('reads a file and executes it', async () => {
        const p = join(testDir, 'script.js');
        await writeFile(p, '1 + 1');
        const out = await boxFile({ path: p });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('2');
    });

    it('captures logs from file execution', async () => {
        const p = join(testDir, 'logger.js');
        await writeFile(p, 'console.log("from file"); 99');
        const out = await boxFile({ path: p });
        expect(out.logs).toContain('from file');
        expect(out.result).toBe('99');
    });

    it('returns error when file does not exist', async () => {
        const out = await boxFile({ path: '/nonexistent/path/file.js' });
        expect(out.error).toBeDefined();
    });

    it('respects timeout for file execution', async () => {
        const p = join(testDir, 'infinite.js');
        await writeFile(p, 'while(true){}');
        const out = await boxFile({ path: p, timeout: 50 });
        expect(out.error).toBeDefined();
    });

    it('executes a TypeScript file (.ts extension)', async () => {
        const p = join(testDir, 'typed.ts');
        await writeFile(p, 'const x: number = 10; x + 5');
        const out = await boxFile({ path: p });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('15');
    });

    it('executes a TypeScript file with interface', async () => {
        const p = join(testDir, 'iface.ts');
        await writeFile(
            p,
            'interface Point { x: number; y: number } const p: Point = { x: 3, y: 4 }; p.x + p.y',
        );
        const out = await boxFile({ path: p });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('7');
    });
});

// ─── boxEval ─────────────────────────────────────────────────────────────────

describe('boxEval', () => {
    it('evaluates numeric expressions', async () => {
        const out = await boxEval({ expression: '1 + 1' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('2');
        expect(out.type).toBe('number');
    });

    it('evaluates JSON.stringify', async () => {
        const out = await boxEval({ expression: 'JSON.stringify({ x: 1 })' });
        expect(out.error).toBeUndefined();
        expect(out.type).toBe('string');
    });

    it('evaluates typeof expressions', async () => {
        const out = await boxEval({ expression: 'typeof 42' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('"number"');
    });

    it('evaluates boolean expressions', async () => {
        const out = await boxEval({ expression: '2 > 1' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('true');
        expect(out.type).toBe('boolean');
    });

    it('returns error on invalid expression', async () => {
        const out = await boxEval({ expression: 'throw new Error("eval error")' });
        expect(out.error).toBeDefined();
    });

    it('returns error on timeout', async () => {
        const out = await boxEval({ expression: '(function(){ while(true){} })()', timeout: 50 });
        expect(out.error).toBeDefined();
    });

    it('process is NOT available in eval sandbox', async () => {
        const out = await boxEval({ expression: 'typeof process' });
        expect(out.value).toBe('"undefined"');
    });

    it('require is NOT available in eval sandbox', async () => {
        const out = await boxEval({ expression: 'typeof require' });
        expect(out.value).toBe('"undefined"');
    });
});

// ─── boxLanguages ─────────────────────────────────────────────────────────────

describe('boxLanguages', () => {
    it('returns the correct list of languages', () => {
        const out = boxLanguages();
        expect(out.languages).toHaveLength(2);
    });

    it('marks javascript as supported', () => {
        const out = boxLanguages();
        const js = out.languages.find((l) => l.name === 'javascript');
        expect(js).toBeDefined();
        expect(js?.supported).toBe(true);
    });

    it('marks typescript as supported', () => {
        const out = boxLanguages();
        const ts = out.languages.find((l) => l.name === 'typescript');
        expect(ts).toBeDefined();
        expect(ts?.supported).toBe(true);
        expect(ts?.note).toBeDefined();
    });
});

// ─── boxRead ──────────────────────────────────────────────────────────────────

describe('boxRead', () => {
    it('reads a file within the working directory', async () => {
        const rel = 'sandbox-test-file.txt';
        const abs = join(process.cwd(), rel);
        await writeFile(abs, 'hello from boxRead');
        try {
            const out = await boxRead({ path: rel });
            expect(out.error).toBeUndefined();
            expect(out.content).toBe('hello from boxRead');
        } finally {
            await rm(abs, { force: true });
        }
    });

    it('rejects absolute paths', async () => {
        const out = await boxRead({ path: '/etc/passwd' });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/absolute/i);
    });

    it('rejects directory traversal with ../', async () => {
        const out = await boxRead({ path: '../../../etc/passwd' });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/escape|working directory/i);
    });

    it('returns error when file does not exist', async () => {
        const out = await boxRead({ path: 'nonexistent-file-xyz.txt' });
        expect(out.error).toBeDefined();
    });

    it('returns the resolved path on success', async () => {
        const rel = 'sandbox-test-path-check.txt';
        const abs = join(process.cwd(), rel);
        await writeFile(abs, 'path check');
        try {
            const out = await boxRead({ path: rel });
            expect(out.error).toBeUndefined();
            expect(out.path).toBe(abs);
        } finally {
            await rm(abs, { force: true });
        }
    });
});

// ─── brick registration ───────────────────────────────────────────────────────

describe('sandbox brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('sandbox:run', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:file', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:eval', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:languages', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:read', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('has the correct manifest', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('sandbox');
        expect(brick.manifest.prefix).toBe('box');
        expect(brick.manifest.tools).toHaveLength(5);
    });
});
