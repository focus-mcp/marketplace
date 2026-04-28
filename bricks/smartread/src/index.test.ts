// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearBus,
    type SmartreadBrickBus,
    setBus,
    srFull,
    srImports,
    srMap,
    srSignatures,
    srSummary,
} from './operations.ts';

let testDir: string;

const sampleTs = [
    "import { readFile } from 'node:fs/promises';",
    "import { join } from 'node:path';",
    '',
    'export function hello(name: string): string {',
    '    return name;',
    '}',
    '',
    'export class Greeter {',
    '    greet() {',
    "        return 'hi';",
    '    }',
    '}',
    '',
    'function internal() {',
    '    return 42;',
    '}',
].join('\n');

// ─── Mock bus ────────────────────────────────────────────────────────────────

function makeMockSymbols(path: string, content: string) {
    const symbols: Array<{
        name: string;
        kind: string;
        file: string;
        line: number;
        endLine: number;
        signature: string;
        exported: boolean;
        parent?: string;
    }> = [];
    const matchers = [
        { re: /^export\s+(async\s+)?function\s+(\w+)/, kind: 'function', idx: 2, exported: true },
        { re: /^export\s+(default\s+)?class\s+(\w+)/, kind: 'class', idx: 2, exported: true },
        { re: /^export\s+interface\s+(\w+)/, kind: 'interface', idx: 1, exported: true },
        { re: /^export\s+type\s+(\w+)/, kind: 'type', idx: 1, exported: true },
        { re: /^export\s+const\s+(\w+)/, kind: 'variable', idx: 1, exported: true },
        { re: /^function\s+(\w+)/, kind: 'function', idx: 1, exported: false },
        { re: /^class\s+(\w+)/, kind: 'class', idx: 1, exported: false },
    ] as const;
    content.split('\n').forEach((line, i) => {
        for (const { re, kind, idx, exported } of matchers) {
            const m = re.exec(line.trimStart());
            if (m) {
                symbols.push({
                    name: m[idx] ?? '',
                    kind,
                    file: path,
                    line: i + 1,
                    endLine: i + 1,
                    signature: line.trim(),
                    exported,
                });
                break;
            }
        }
    });
    return { symbols, imports: [], exports: [] };
}

function makeMockImports(content: string) {
    const imports: Array<{ from: string; names: string[] }> = [];
    for (const line of content.split('\n')) {
        const m = /^import\s+.*from\s+['"]([^'"]+)['"]/.exec(line);
        if (m) {
            const nm = /\{\s*([^}]+)\s*\}/.exec(line);
            imports.push({
                from: m[1] ?? '',
                names: nm
                    ? (nm[1] ?? '')
                          .split(',')
                          .map((n) => n.trim())
                          .filter(Boolean)
                    : [],
            });
        }
    }
    return { imports };
}

function makeMockBus(): SmartreadBrickBus {
    return {
        request: vi.fn(async (target: string, payload: unknown): Promise<unknown> => {
            const { path, content } = payload as { path: string; content: string };
            if (target === 'treesitter:extract-symbols') return makeMockSymbols(path, content);
            if (target === 'treesitter:extract-imports') return makeMockImports(content);
            throw new Error(`Unexpected bus target: ${target}`);
        }) as SmartreadBrickBus['request'],
    };
}

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-smartread-test-'));
    await writeFile(join(testDir, 'sample.ts'), sampleTs);
    setBus(makeMockBus());
});

afterEach(async () => {
    clearBus();
    await rm(testDir, { recursive: true, force: true });
});

describe('srFull', () => {
    it('reads full file content', async () => {
        const result = await srFull({ path: join(testDir, 'sample.ts') });
        expect(result.content).toBe(sampleTs);
    });

    it('throws on non-existent file', async () => {
        await expect(srFull({ path: join(testDir, 'nope.ts') })).rejects.toThrow();
    });
});

describe('srMap', () => {
    it('returns function and class signature lines (TS)', async () => {
        const result = await srMap({ path: join(testDir, 'sample.ts') });
        expect(result.lines.some((l) => l.includes('hello'))).toBe(true);
        expect(result.lines.some((l) => l.includes('Greeter'))).toBe(true);
    });

    it('returns lines for PHP file', async () => {
        const phpContent = '<?php\nclass UserService {\n    public function find(): void {}\n}\n';
        await writeFile(join(testDir, 'service.php'), phpContent);
        const result = await srMap({ path: join(testDir, 'service.php') });
        expect(Array.isArray(result.lines)).toBe(true);
    });

    it('returns lines for Python file', async () => {
        const pyContent = 'class DataProcessor:\n    def process(self): pass\n';
        await writeFile(join(testDir, 'processor.py'), pyContent);
        const result = await srMap({ path: join(testDir, 'processor.py') });
        expect(Array.isArray(result.lines)).toBe(true);
    });
});

describe('srSignatures', () => {
    it('returns only exported signatures (TS)', async () => {
        const result = await srSignatures({ path: join(testDir, 'sample.ts') });
        expect(result.lines.some((l) => l.includes('hello'))).toBe(true);
        expect(result.lines.some((l) => l.includes('Greeter'))).toBe(true);
        expect(result.lines.some((l) => l === 'function internal()')).toBe(false);
    });
});

describe('srImports', () => {
    it('returns import lines (TS)', async () => {
        const result = await srImports({ path: join(testDir, 'sample.ts') });
        expect(result.lines.length).toBeGreaterThanOrEqual(2);
        expect(result.lines.some((l) => l.includes('fs/promises'))).toBe(true);
    });
});

describe('srSummary', () => {
    it('returns blocks with name and line range', async () => {
        const result = await srSummary({ path: join(testDir, 'sample.ts') });
        expect(result.entries.length).toBeGreaterThan(0);
        const names = result.entries.map((e) => e.name);
        expect(names).toContain('hello');
        expect(names).toContain('Greeter');
        for (const entry of result.entries) {
            expect(entry.endLine).toBeGreaterThanOrEqual(entry.startLine);
            expect(entry.lineCount).toBeGreaterThan(0);
        }
    });
});

describe('smartread brick', () => {
    it('registers 5 handlers on start, injects bus, unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const mockBus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(),
        };

        await brick.start({ bus: mockBus });
        expect(mockBus.handle).toHaveBeenCalledTimes(5);
        expect(mockBus.handle).toHaveBeenCalledWith('smartread:full', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('smartread:map', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('smartread:signatures', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('smartread:imports', expect.any(Function));
        expect(mockBus.handle).toHaveBeenCalledWith('smartread:summary', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
