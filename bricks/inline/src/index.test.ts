// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inlExtract, inlInline, inlMove } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-inline-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── inlInline ───────────────────────────────────────────────────────────────

describe('inlInline', () => {
    it('inlines a const variable — dry run does not modify file', async () => {
        const src = [
            'const greeting = "hello";',
            'console.log(greeting);',
            'const msg = greeting + " world";',
        ].join('\n');
        const path = await makeFile('a.ts', src);

        const result = await inlInline({ path, name: 'greeting' });

        expect(result.inlined).toBe(true);
        expect(result.usagesReplaced).toBe(2);
        expect(result.definitionRemoved).toBe(true);
        expect(result.preview).toContain('"hello"');
        expect(result.preview).not.toContain('const greeting');
        // Dry run: file unchanged
        const { readFile } = await import('node:fs/promises');
        expect(await readFile(path, 'utf-8')).toBe(src);
    });

    it('applies inline when apply=true', async () => {
        const src = 'const x = 42;\nconst y = x + 1;\n';
        const path = await makeFile('b.ts', src);

        const result = await inlInline({ path, name: 'x', apply: true });

        expect(result.inlined).toBe(true);
        const { readFile } = await import('node:fs/promises');
        const updated = await readFile(path, 'utf-8');
        expect(updated).toContain('42 + 1');
        expect(updated).not.toContain('const x');
    });

    it('inlines a simple arrow function', async () => {
        const src = 'const double = (n) => n * 2;\nconst result = double(5);\n';
        const path = await makeFile('c.ts', src);

        const result = await inlInline({ path, name: 'double' });

        expect(result.inlined).toBe(true);
        expect(result.usagesReplaced).toBe(1);
        expect(result.preview).toContain('5 * 2');
        expect(result.preview).not.toContain('const double');
    });

    it('inlines a simple function declaration', async () => {
        const src = 'function add(a, b) { return a + b; }\nconst r = add(1, 2);\n';
        const path = await makeFile('d.ts', src);

        const result = await inlInline({ path, name: 'add' });

        expect(result.inlined).toBe(true);
        expect(result.usagesReplaced).toBe(1);
        expect(result.preview).toContain('1 + 2');
        expect(result.preview).not.toContain('function add');
    });

    it('returns inlined=false when name not found', async () => {
        const path = await makeFile('e.ts', 'const x = 1;\n');
        const result = await inlInline({ path, name: 'notExisting' });
        expect(result.inlined).toBe(false);
        expect(result.usagesReplaced).toBe(0);
    });
});

// ─── inlExtract ──────────────────────────────────────────────────────────────

describe('inlExtract', () => {
    it('extracts lines into a new function — dry run', async () => {
        const src = [
            'function main() {',
            '    const x = 1;',
            '    const y = 2;',
            '    console.log(x + y);',
            '}',
        ].join('\n');
        const path = await makeFile('f.ts', src);

        const result = await inlExtract({
            path,
            startLine: 2,
            endLine: 4,
            functionName: 'doWork',
        });

        expect(result.extracted).toBe(true);
        expect(result.preview).toContain('function doWork(');
        expect(result.preview).toContain('doWork(');
        // Dry run: file unchanged
        const { readFile } = await import('node:fs/promises');
        expect(await readFile(path, 'utf-8')).toBe(src);
    });

    it('replaces original lines with a function call', async () => {
        const src = 'const a = 1;\nconsole.log(a);\n';
        const path = await makeFile('g.ts', src);

        const result = await inlExtract({
            path,
            startLine: 2,
            endLine: 2,
            functionName: 'logA',
            apply: true,
        });

        expect(result.extracted).toBe(true);
        const { readFile } = await import('node:fs/promises');
        const updated = await readFile(path, 'utf-8');
        expect(updated).toContain('function logA(');
        expect(updated).toContain('logA(');
    });

    it('detects external variables as params', async () => {
        const src = 'const val = 42;\nconsole.log(val);\n';
        const path = await makeFile('h.ts', src);

        const result = await inlExtract({
            path,
            startLine: 2,
            endLine: 2,
            functionName: 'printVal',
        });

        expect(result.extracted).toBe(true);
        expect(result.params).toContain('val');
        expect(result.functionSignature).toContain('val');
    });

    it('returns extracted=false for invalid line range', async () => {
        const path = await makeFile('i.ts', 'const x = 1;\n');
        const result = await inlExtract({
            path,
            startLine: 5,
            endLine: 10,
            functionName: 'nope',
        });
        expect(result.extracted).toBe(false);
    });
});

// ─── inlMove ─────────────────────────────────────────────────────────────────

describe('inlMove', () => {
    it('moves a function between files — dry run', async () => {
        const srcContent = [
            'export function helper() {',
            '    return 42;',
            '}',
            '',
            'export function main() {',
            '    return helper();',
            '}',
        ].join('\n');
        const source = await makeFile('source.ts', srcContent);
        const target = await makeFile('target.ts', '');

        const result = await inlMove({ sourcePath: source, targetPath: target, name: 'helper' });

        expect(result.moved).toBe(true);
        expect(result.sourceUpdated).toBe(true);
        expect(result.targetUpdated).toBe(true);
        expect(result.preview).toContain('export function helper');
        // Dry run: source unchanged
        const { readFile } = await import('node:fs/promises');
        expect(await readFile(source, 'utf-8')).toBe(srcContent);
    });

    it('applies move when apply=true and adds import in source', async () => {
        const srcContent =
            'export function greet() { return "hi"; }\nexport function run() { return greet(); }\n';
        const source = await makeFile('src.ts', srcContent);
        const target = await makeFile('tgt.ts', '');

        const result = await inlMove({
            sourcePath: source,
            targetPath: target,
            name: 'greet',
            apply: true,
        });

        expect(result.moved).toBe(true);
        const { readFile } = await import('node:fs/promises');
        const updatedSrc = await readFile(source, 'utf-8');
        const updatedTgt = await readFile(target, 'utf-8');
        expect(updatedSrc).toContain('import { greet } from');
        expect(updatedSrc).not.toMatch(/^export function greet/m);
        expect(updatedTgt).toContain('export function greet');
    });

    it('returns moved=false when function not found', async () => {
        const source = await makeFile('missing.ts', 'export const x = 1;\n');
        const target = await makeFile('tgt2.ts', '');

        const result = await inlMove({ sourcePath: source, targetPath: target, name: 'notThere' });
        expect(result.moved).toBe(false);
    });
});

// ─── Brick registration ───────────────────────────────────────────────────────

describe('inline brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('inline:inline', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('inline:extract', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('inline:move', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
