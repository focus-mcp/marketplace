// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { cmpOutput, cmpResponse, cmpTerse } from './operations.ts';

// ─── cmpOutput ───────────────────────────────────────────────────────────────

describe('cmpOutput', () => {
    it('removes block comments (light)', () => {
        const text = '/* header */\nconst x = 1;';
        const result = cmpOutput({ text, level: 'light' });
        expect(result.compressed).not.toContain('/* header */');
        expect(result.compressed).toContain('const x = 1;');
    });

    it('removes blank lines (light)', () => {
        const text = 'const x = 1;\n\n\nconst y = 2;';
        const result = cmpOutput({ text, level: 'light' });
        expect(result.compressed).not.toMatch(/\n\n/);
    });

    it('removes line comments (medium)', () => {
        const text = 'const x = 1; // inline comment\nconst y = 2;';
        const result = cmpOutput({ text, level: 'medium' });
        expect(result.compressed).not.toContain('// inline comment');
        expect(result.compressed).toContain('const x = 1;');
    });

    it('collapses whitespace (medium)', () => {
        const text = 'const   x   =   1;';
        const result = cmpOutput({ text, level: 'medium' });
        expect(result.compressed).toBe('const x = 1;');
    });

    it('abbreviates patterns (aggressive)', () => {
        const text = 'console.log("hello");';
        const result = cmpOutput({ text, level: 'aggressive' });
        expect(result.compressed).toContain('log(');
        expect(result.compressed).not.toContain('console.log(');
    });

    it('defaults to medium level', () => {
        const text = '/* comment */\nconst x = 1;';
        const result = cmpOutput({ text });
        expect(result.compressed).not.toContain('/* comment */');
    });

    it('returns correct lengths and ratio', () => {
        const text = 'hello world';
        const result = cmpOutput({ text, level: 'light' });
        expect(result.originalLength).toBe(text.length);
        expect(result.compressedLength).toBe(result.compressed.length);
        expect(result.ratio).toBeGreaterThan(0);
    });

    it('returns ratio 1 for empty input', () => {
        const result = cmpOutput({ text: '', level: 'medium' });
        expect(result.ratio).toBe(1);
    });
});

// ─── cmpResponse ─────────────────────────────────────────────────────────────

describe('cmpResponse', () => {
    it('strips null values', () => {
        const json = JSON.stringify({ a: 1, b: null, c: 'hello' });
        const result = cmpResponse({ json });
        const parsed = JSON.parse(result.compressed) as Record<string, unknown>;
        expect(parsed['b']).toBeUndefined();
        expect(parsed['a']).toBe(1);
        expect(parsed['c']).toBe('hello');
    });

    it('shortens common path prefix', () => {
        const data = {
            files: ['/home/user/project/src/a.ts', '/home/user/project/src/b.ts'],
        };
        const result = cmpResponse({ json: JSON.stringify(data) });
        const parsed = JSON.parse(result.compressed) as { files: string[] };
        for (const f of parsed.files) {
            expect(f).not.toContain('/home/user/project/src/');
        }
    });

    it('returns original on invalid JSON', () => {
        const result = cmpResponse({ json: 'not-json' });
        expect(result.compressed).toBe('not-json');
        expect(result.ratio).toBe(1);
    });

    it('returns ratio <= 1 for compressible input', () => {
        const json = JSON.stringify({ a: null, b: null, c: null, d: 'value' });
        const result = cmpResponse({ json });
        expect(result.ratio).toBeLessThanOrEqual(1);
    });
});

// ─── cmpTerse ─────────────────────────────────────────────────────────────────

describe('cmpTerse', () => {
    it('extracts function and class names', () => {
        const text = 'function hello() {}\nclass World {}\nconst x = 1;';
        const result = cmpTerse({ text });
        expect(result.terse).toContain('hello');
        expect(result.terse).toContain('World');
        expect(result.terse).toContain('x');
    });

    it('deduplicates identifiers', () => {
        const text = 'function foo() {}\nfunction foo() {}';
        const result = cmpTerse({ text });
        const names = result.terse.split(', ');
        const fooCount = names.filter((n) => n === 'foo').length;
        expect(fooCount).toBe(1);
    });

    it('returns smaller ratio than original', () => {
        const text = [
            'export async function processRequest(req: Request): Promise<Response> {',
            '    const data = await req.json();',
            '    return new Response(JSON.stringify(data));',
            '}',
        ].join('\n');
        const result = cmpTerse({ text });
        expect(result.ratio).toBeLessThan(1);
    });

    it('returns empty terse for no identifiers', () => {
        const result = cmpTerse({ text: '// just a comment\n' });
        expect(result.terse).toBe('');
    });
});

// ─── compress brick ───────────────────────────────────────────────────────────

describe('compress brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('compress:output', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('compress:response', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('compress:terse', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
