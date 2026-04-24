// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boxEval, boxFile, boxLanguages, boxRun } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-sandbox-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── boxRun ──────────────────────────────────────────────────────────────────

describe('boxRun', () => {
    it('executes simple math and returns result', () => {
        const out = boxRun({ code: '1 + 2' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('3');
        expect(out.duration).toBeGreaterThanOrEqual(0);
    });

    it('captures console.log output', () => {
        const out = boxRun({ code: 'console.log("hello", "world"); 42' });
        expect(out.error).toBeUndefined();
        expect(out.logs).toContain('hello world');
        expect(out.result).toBe('42');
    });

    it('captures console.error output', () => {
        const out = boxRun({ code: 'console.error("oops")' });
        expect(out.logs).toContain('[error] oops');
    });

    it('captures console.warn output', () => {
        const out = boxRun({ code: 'console.warn("careful")' });
        expect(out.logs).toContain('[warn] careful');
    });

    it('returns error on timeout', () => {
        const out = boxRun({ code: 'while(true){}', timeout: 50 });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/timed? ?out|Script execution timed out/i);
    });

    it('returns error on syntax/runtime error', () => {
        const out = boxRun({ code: 'throw new Error("boom")' });
        expect(out.error).toBeDefined();
        expect(out.error).toMatch(/boom/);
    });

    it('returns "undefined" result for void code', () => {
        const out = boxRun({ code: 'const x = 1;' });
        expect(out.result).toBe('undefined');
    });

    it('process is NOT available in sandbox', () => {
        const out = boxRun({ code: 'typeof process' });
        expect(out.result).toBe('"undefined"');
    });

    it('require is NOT available in sandbox', () => {
        const out = boxRun({ code: 'typeof require' });
        expect(out.result).toBe('"undefined"');
    });

    it('__dirname is NOT available in sandbox', () => {
        const out = boxRun({ code: 'typeof __dirname' });
        expect(out.result).toBe('"undefined"');
    });

    it('global is NOT available in sandbox', () => {
        const out = boxRun({ code: 'typeof global' });
        expect(out.result).toBe('"undefined"');
    });

    it('can use JSON in sandbox', () => {
        const out = boxRun({ code: 'JSON.stringify({ a: 1 })' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('"{\\"a\\":1}"');
    });

    it('can use Math in sandbox', () => {
        const out = boxRun({ code: 'Math.max(1, 2, 3)' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('3');
    });

    it('can use Array in sandbox', () => {
        const out = boxRun({ code: '[1, 2, 3].map(x => x * 2)' });
        expect(out.error).toBeUndefined();
        expect(out.result).toBe('[2,4,6]');
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
});

// ─── boxEval ─────────────────────────────────────────────────────────────────

describe('boxEval', () => {
    it('evaluates numeric expressions', () => {
        const out = boxEval({ expression: '1 + 1' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('2');
        expect(out.type).toBe('number');
    });

    it('evaluates JSON.stringify', () => {
        const out = boxEval({ expression: 'JSON.stringify({ x: 1 })' });
        expect(out.error).toBeUndefined();
        expect(out.type).toBe('string');
    });

    it('evaluates typeof expressions', () => {
        const out = boxEval({ expression: 'typeof 42' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('"number"');
    });

    it('evaluates boolean expressions', () => {
        const out = boxEval({ expression: '2 > 1' });
        expect(out.error).toBeUndefined();
        expect(out.value).toBe('true');
        expect(out.type).toBe('boolean');
    });

    it('returns error on invalid expression', () => {
        const out = boxEval({ expression: 'throw new Error("eval error")' });
        expect(out.error).toBeDefined();
    });

    it('returns error on timeout', () => {
        const out = boxEval({ expression: '(function(){ while(true){} })()', timeout: 50 });
        expect(out.error).toBeDefined();
    });

    it('process is NOT available in eval sandbox', () => {
        const out = boxEval({ expression: 'typeof process' });
        expect(out.value).toBe('"undefined"');
    });

    it('require is NOT available in eval sandbox', () => {
        const out = boxEval({ expression: 'typeof require' });
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

    it('marks typescript as not supported with a note', () => {
        const out = boxLanguages();
        const ts = out.languages.find((l) => l.name === 'typescript');
        expect(ts).toBeDefined();
        expect(ts?.supported).toBe(false);
        expect(ts?.note).toBeDefined();
    });
});

// ─── brick registration ───────────────────────────────────────────────────────

describe('sandbox brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('sandbox:run', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:file', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:eval', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('sandbox:languages', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('has the correct manifest', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('sandbox');
        expect(brick.manifest.prefix).toBe('box');
        expect(brick.manifest.tools).toHaveLength(4);
    });
});
