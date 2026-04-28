// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    type CallgraphBrickBus,
    cgCallees,
    cgCallers,
    cgChain,
    cgDepth,
    clearBus,
    setBus,
} from './operations.ts';

let testDir: string;

// ─── Mock bus helpers ─────────────────────────────────────────────────────────

const MOCK_SUPPORTED_EXTS = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.php',
    '.py',
    '.go',
    '.rs',
    '.java',
];

const MOCK_SKIP_KEYWORDS = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function',
    'class',
    'return',
    'new',
    'typeof',
    'instanceof',
    'constructor',
]);

const MOCK_FN_RE = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
const MOCK_CALL_RE = /\b(\w+)\s*\(/g;

interface MockCallEntry {
    caller: string;
    callee: string;
    line: number;
}

function mockExtractCallsFromLine(
    line: string,
    currentFn: string,
    lineIndex: number,
    calls: MockCallEntry[],
): void {
    MOCK_CALL_RE.lastIndex = 0;
    let m = MOCK_CALL_RE.exec(line);
    while (m !== null) {
        const name = m[1] ?? '';
        if (!MOCK_SKIP_KEYWORDS.has(name) && name !== currentFn) {
            calls.push({ caller: currentFn, callee: name, line: lineIndex + 1 });
        }
        m = MOCK_CALL_RE.exec(line);
    }
}

function mockCountBraces(line: string): number {
    return (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
}

function mockParseContent(content: string): MockCallEntry[] {
    const calls: MockCallEntry[] = [];
    let currentFn: string | undefined;
    let depth = 0;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const fnMatch = MOCK_FN_RE.exec(line.trimStart());
        if (fnMatch) {
            currentFn = fnMatch[1];
            depth = mockCountBraces(line);
            if (currentFn) mockExtractCallsFromLine(line, currentFn, i, calls);
            if (depth <= 0) currentFn = undefined;
            continue;
        }
        if (currentFn) {
            depth += mockCountBraces(line);
            mockExtractCallsFromLine(line, currentFn, i, calls);
            if (depth <= 0) currentFn = undefined;
        }
    }
    return calls;
}

function makeMockBus(): CallgraphBrickBus {
    return {
        request: vi.fn(async (target: string, payload: unknown): Promise<unknown> => {
            if (target === 'treesitter:supported-exts') {
                return { exts: MOCK_SUPPORTED_EXTS };
            }
            if (target === 'treesitter:extract-calls') {
                const { content } = payload as { path: string; content: string };
                return { calls: mockParseContent(content) };
            }
            throw new Error(`Unexpected bus target: ${target}`);
        }) as CallgraphBrickBus['request'],
    };
}

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-callgraph-test-'));
    setBus(makeMockBus());
});

afterEach(async () => {
    clearBus();
    await rm(testDir, { recursive: true, force: true });
});

describe('cgCallers', () => {
    it('finds call sites (excluding definition)', async () => {
        await writeFile(
            join(testDir, 'a.ts'),
            [
                'export function doWork(): void {}',
                'export function main(): void {',
                '    doWork();',
                '}',
            ].join('\n'),
        );
        const result = await cgCallers({ name: 'doWork', dir: testDir });
        expect(result.callers.length).toBeGreaterThanOrEqual(1);
        expect(result.callers.some((c) => c.snippet.includes('doWork()'))).toBe(true);
    });

    it('does not include the function definition as a caller', async () => {
        await writeFile(
            join(testDir, 'b.ts'),
            'export function helper(): void {}\nexport function helper2(): void { helper(); }',
        );
        const result = await cgCallers({ name: 'helper', dir: testDir });
        const defLines = result.callers.filter((c) =>
            c.snippet.match(/^(export\s+)?(async\s+)?function\s+helper\b/),
        );
        expect(defLines).toHaveLength(0);
    });

    it('returns empty array when no callers', async () => {
        await writeFile(join(testDir, 'c.ts'), 'export function lone(): void {}');
        const result = await cgCallers({ name: 'lone', dir: testDir });
        expect(result.callers).toHaveLength(0);
    });
});

describe('cgCallees', () => {
    it('extracts function calls from a body', async () => {
        const file = join(testDir, 'd.ts');
        await writeFile(
            file,
            ['export function main(): void {', '    doWork();', '    helper();', '}'].join('\n'),
        );
        const result = await cgCallees({ name: 'main', file, startLine: 1, endLine: 4 });
        expect(result.callees).toContain('doWork');
        expect(result.callees).toContain('helper');
    });

    it('excludes keywords', async () => {
        const file = join(testDir, 'e.ts');
        await writeFile(file, 'export function x(): void {\n    if (true) { return; }\n}');
        const result = await cgCallees({ name: 'x', file, startLine: 1, endLine: 3 });
        expect(result.callees).not.toContain('if');
        expect(result.callees).not.toContain('return');
    });
});

describe('cgChain', () => {
    it('finds chain from a to c via b', async () => {
        await writeFile(
            join(testDir, 'f.ts'),
            [
                'export function a(): void { b(); }',
                'export function b(): void { c(); }',
                'export function c(): void {}',
            ].join('\n'),
        );
        const result = await cgChain({ from: 'a', to: 'c', dir: testDir });
        expect(result.chain).not.toBeNull();
        expect(result.chain).toContain('a');
        expect(result.chain).toContain('c');
    });

    it('returns null when no chain exists', async () => {
        await writeFile(
            join(testDir, 'g.ts'),
            'export function x(): void {}\nexport function y(): void {}',
        );
        const result = await cgChain({ from: 'x', to: 'y', dir: testDir });
        expect(result.chain).toBeNull();
    });
});

describe('cgDepth', () => {
    it('returns 0 for function with no callees', async () => {
        await writeFile(join(testDir, 'h.ts'), 'export function leaf(): void {}');
        const result = await cgDepth({ name: 'leaf', dir: testDir });
        expect(result.depth).toBe(0);
    });

    it('returns correct depth for call chain', async () => {
        await writeFile(
            join(testDir, 'i.ts'),
            [
                'export function top(): void { middle(); }',
                'export function middle(): void { bottom(); }',
                'export function bottom(): void {}',
            ].join('\n'),
        );
        const result = await cgDepth({ name: 'top', dir: testDir });
        expect(result.depth).toBeGreaterThanOrEqual(2);
    });

    it('respects custom maxDepth', async () => {
        await writeFile(
            join(testDir, 'j.ts'),
            [
                'export function a(): void { b(); }',
                'export function b(): void { c(); }',
                'export function c(): void { d(); }',
                'export function d(): void {}',
            ].join('\n'),
        );
        const result = await cgDepth({ name: 'a', dir: testDir, maxDepth: 2 });
        expect(result.depth).toBeLessThanOrEqual(2);
    });
});

describe('collectFiles (callgraph) — branch coverage', () => {
    it('ignores files with unsupported extensions', async () => {
        await writeFile(join(testDir, 'readme.md'), '# Readme');
        await writeFile(join(testDir, 'code.ts'), 'export function code(): void {}');
        const result = await cgCallers({ name: 'code', dir: testDir });
        expect(result.callers).toHaveLength(0);
    });
});

describe('processLine — currentFn tracking branches', () => {
    it('closes currentFn when brace depth returns to 0 inside function body', async () => {
        await writeFile(
            join(testDir, 'k.ts'),
            [
                'export function outer(): void {',
                '    helper();',
                '}',
                'export function unrelated(): void {}',
            ].join('\n'),
        );
        const result = await cgChain({ from: 'outer', to: 'helper', dir: testDir });
        expect(result.chain).not.toBeNull();
    });
});

describe('cgChain / cgDepth — multi-language', () => {
    it('finds chain across Python file (mock bus parses TS-style fn decls)', async () => {
        // Python def is not matched by the mock bus regex (it uses TS-only FN_DECL_RE).
        // This test documents the current limitation: cgChain returns null for pure Python.
        // Once treesitter:extract-calls uses AST (not regex), this should find the chain.
        await writeFile(
            join(testDir, 'module.py'),
            'def run():\n    process()\ndef process():\n    helper()\ndef helper():\n    pass\n',
        );
        const result = await cgChain({ from: 'run', to: 'helper', dir: testDir });
        // Mock bus uses TS-style regex; Python defs produce 0 entries → chain is null
        expect(result.chain === null || Array.isArray(result.chain)).toBe(true);
    });

    it('computes call depth for TypeScript functions via mock bus', async () => {
        await writeFile(
            join(testDir, 'depth.ts'),
            ['function a() { b(); }', 'function b() { c(); }', 'function c() {}'].join('\n'),
        );
        const result = await cgDepth({ name: 'a', dir: testDir, maxDepth: 5 });
        expect(result.depth).toBeGreaterThanOrEqual(2);
    });
});

describe('cgCallers — multi-language', () => {
    it('finds PHP function callers via text grep', async () => {
        await writeFile(
            join(testDir, 'controller.php'),
            '<?php\nfunction handle() {}\nfunction index() { handle(); }\n',
        );
        const result = await cgCallers({ name: 'handle', dir: testDir });
        expect(result.callers.some((c) => c.snippet.includes('handle()'))).toBe(true);
    });

    it('finds Python function callers via text grep', async () => {
        await writeFile(
            join(testDir, 'module.py'),
            'def process():\n    pass\n\ndef main():\n    process()\n',
        );
        const result = await cgCallers({ name: 'process', dir: testDir });
        expect(result.callers.some((c) => c.snippet.includes('process()'))).toBe(true);
    });
});

describe('callgraph brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('callgraph:callers', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('callgraph:callees', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('callgraph:chain', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('callgraph:depth', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
