// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { srFull, srImports, srMap, srSignatures, srSummary } from './operations.ts';

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

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-smartread-test-'));
    await writeFile(join(testDir, 'sample.ts'), sampleTs);
});

afterEach(async () => {
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
    it('returns function and class signature lines', async () => {
        const result = await srMap({ path: join(testDir, 'sample.ts') });
        expect(result.lines.some((l) => l.includes('function hello'))).toBe(true);
        expect(result.lines.some((l) => l.includes('class Greeter'))).toBe(true);
        expect(result.lines.some((l) => l.includes('function internal'))).toBe(true);
    });
});

describe('srSignatures', () => {
    it('returns only exported signatures', async () => {
        const result = await srSignatures({ path: join(testDir, 'sample.ts') });
        expect(result.lines.some((l) => l.includes('export function hello'))).toBe(true);
        expect(result.lines.some((l) => l.includes('export class Greeter'))).toBe(true);
        // internal function should NOT appear
        expect(result.lines.some((l) => l.includes('function internal'))).toBe(false);
    });
});

describe('srImports', () => {
    it('returns import lines', async () => {
        const result = await srImports({ path: join(testDir, 'sample.ts') });
        expect(result.lines.length).toBe(2);
        expect(result.lines[0]).toContain('node:fs/promises');
        expect(result.lines[1]).toContain('node:path');
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
        expect(bus.handle).toHaveBeenCalledWith('smartread:full', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartread:map', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartread:signatures', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartread:imports', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartread:summary', expect.any(Function));
        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
