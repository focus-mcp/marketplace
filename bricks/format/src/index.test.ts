// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { fmtJson, fmtMarkdown, fmtTable, fmtYaml } from './operations.ts';

// ─── fmtJson ─────────────────────────────────────────────────────────────────

describe('fmtJson', () => {
    it('pretty-prints JSON with default indent of 2', () => {
        const result = fmtJson({ data: '{"b":1,"a":2}' });
        expect(result.formatted).toBe('{\n  "b": 1,\n  "a": 2\n}');
        expect(result.lines).toBe(4);
    });

    it('respects custom indent', () => {
        const result = fmtJson({ data: '{"x":1}', indent: 4 });
        expect(result.formatted).toBe('{\n    "x": 1\n}');
    });

    it('sorts keys when sortKeys is true', () => {
        const result = fmtJson({ data: '{"b":1,"a":2}', sortKeys: true });
        expect(result.formatted).toBe('{\n  "a": 2,\n  "b": 1\n}');
    });

    it('sorts nested keys recursively', () => {
        const result = fmtJson({ data: '{"z":{"b":1,"a":2},"a":0}', sortKeys: true });
        const parsed = JSON.parse(result.formatted) as Record<string, unknown>;
        expect(Object.keys(parsed)).toEqual(['a', 'z']);
        expect(Object.keys(parsed['z'] as object)).toEqual(['a', 'b']);
    });

    it('sorts keys inside arrays', () => {
        const result = fmtJson({ data: '[{"b":1,"a":2}]', sortKeys: true });
        const parsed = JSON.parse(result.formatted) as Array<Record<string, unknown>>;
        expect(Object.keys(parsed[0] ?? {})).toEqual(['a', 'b']);
    });

    it('does not sort keys when sortKeys is false', () => {
        const result = fmtJson({ data: '{"b":1,"a":2}', sortKeys: false });
        expect(result.formatted).toBe('{\n  "b": 1,\n  "a": 2\n}');
    });

    it('counts lines correctly', () => {
        const result = fmtJson({ data: '[1,2,3]' });
        expect(result.lines).toBe(result.formatted.split('\n').length);
    });

    it('throws on invalid JSON', () => {
        expect(() => fmtJson({ data: 'not-json' })).toThrow();
    });
});

// ─── fmtYaml ─────────────────────────────────────────────────────────────────

describe('fmtYaml', () => {
    it('converts a flat object to YAML', () => {
        const result = fmtYaml({ data: '{"name":"alice","age":30}' });
        expect(result.yaml).toContain('name: alice');
        expect(result.yaml).toContain('age: 30');
    });

    it('converts an array to YAML', () => {
        const result = fmtYaml({ data: '["a","b","c"]' });
        expect(result.yaml).toContain('- a');
        expect(result.yaml).toContain('- b');
        expect(result.yaml).toContain('- c');
    });

    it('handles nested objects', () => {
        const result = fmtYaml({ data: '{"user":{"name":"bob","active":true}}' });
        expect(result.yaml).toContain('user:');
        expect(result.yaml).toContain('name: bob');
        expect(result.yaml).toContain('active: true');
    });

    it('handles null values', () => {
        const result = fmtYaml({ data: '{"val":null}' });
        expect(result.yaml).toContain('val: null');
    });

    it('handles boolean values', () => {
        const result = fmtYaml({ data: '{"ok":true,"fail":false}' });
        expect(result.yaml).toContain('ok: true');
        expect(result.yaml).toContain('fail: false');
    });

    it('quotes strings with special characters', () => {
        const result = fmtYaml({ data: '{"key":"val: with colon"}' });
        expect(result.yaml).toContain('"val: with colon"');
    });

    it('handles arrays of objects', () => {
        const result = fmtYaml({ data: '[{"id":1},{"id":2}]' });
        expect(result.yaml).toContain('- ');
        expect(result.yaml).toContain('id: 1');
        expect(result.yaml).toContain('id: 2');
    });

    it('handles primitive value at root', () => {
        const result = fmtYaml({ data: '"hello"' });
        expect(result.yaml).toBe('hello');
    });

    it('throws on invalid JSON', () => {
        expect(() => fmtYaml({ data: '{bad}' })).toThrow();
    });
});

// ─── fmtMarkdown ─────────────────────────────────────────────────────────────

describe('fmtMarkdown', () => {
    describe('style: list (default)', () => {
        it('converts flat object to markdown list', () => {
            const result = fmtMarkdown({ data: '{"name":"alice","age":30}' });
            expect(result.markdown).toContain('**name**: alice');
            expect(result.markdown).toContain('**age**: 30');
        });

        it('converts array of strings to list', () => {
            const result = fmtMarkdown({ data: '["a","b"]', style: 'list' });
            expect(result.markdown).toContain('- a');
            expect(result.markdown).toContain('- b');
        });

        it('handles nested objects in list style', () => {
            const result = fmtMarkdown({ data: '{"meta":{"version":1}}', style: 'list' });
            expect(result.markdown).toContain('**meta**:');
            expect(result.markdown).toContain('**version**: 1');
        });
    });

    describe('style: table', () => {
        it('converts array of objects to markdown table', () => {
            const result = fmtMarkdown({
                data: '[{"name":"alice","age":30},{"name":"bob","age":25}]',
                style: 'table',
            });
            expect(result.markdown).toContain('name');
            expect(result.markdown).toContain('alice');
            expect(result.markdown).toContain('bob');
            expect(result.markdown).toContain('---');
            expect(result.markdown).toContain('|');
        });

        it('converts flat object to key/value table', () => {
            const result = fmtMarkdown({ data: '{"x":1,"y":2}', style: 'table' });
            expect(result.markdown).toContain('Key');
            expect(result.markdown).toContain('Value');
            expect(result.markdown).toContain('| x');
        });
    });

    describe('style: headings', () => {
        it('renders object keys as headings', () => {
            const result = fmtMarkdown({
                data: '{"Title":"Hello","Body":"World"}',
                style: 'headings',
            });
            expect(result.markdown).toContain('## Title');
            expect(result.markdown).toContain('Hello');
            expect(result.markdown).toContain('## Body');
        });

        it('handles nested object with deeper headings', () => {
            const result = fmtMarkdown({
                data: '{"section":{"subsection":"value"}}',
                style: 'headings',
            });
            expect(result.markdown).toContain('## section');
            expect(result.markdown).toContain('### subsection');
        });
    });

    it('throws on invalid JSON', () => {
        expect(() => fmtMarkdown({ data: 'oops' })).toThrow();
    });
});

// ─── fmtTable ────────────────────────────────────────────────────────────────

describe('fmtTable', () => {
    it('renders a basic ASCII table', () => {
        const result = fmtTable({
            headers: ['Name', 'Age'],
            rows: [
                ['Alice', '30'],
                ['Bob', '25'],
            ],
        });
        expect(result.table).toContain('+');
        expect(result.table).toContain('|');
        expect(result.table).toContain('Name');
        expect(result.table).toContain('Alice');
        expect(result.table).toContain('Bob');
    });

    it('includes separator lines between header and body', () => {
        const result = fmtTable({
            headers: ['A', 'B'],
            rows: [['1', '2']],
        });
        const lines = result.table.split('\n');
        // pattern: sep, header, sep, row, sep
        expect(lines[0]).toMatch(/^\+[-+]+\+$/);
        expect(lines[2]).toMatch(/^\+[-+]+\+$/);
        expect(lines[4]).toMatch(/^\+[-+]+\+$/);
    });

    it('right-aligns columns with align: right', () => {
        const result = fmtTable({
            headers: ['Num'],
            rows: [['42'], ['1000']],
            align: ['right'],
        });
        // The column width should be max('Num'.length, '42'.length, '1000'.length) = 4
        // '42' right-aligned in 4 chars = '  42'
        expect(result.table).toContain('  42');
    });

    it('center-aligns columns with align: center', () => {
        const result = fmtTable({
            headers: ['X'],
            rows: [['hello']],
            align: ['center'],
        });
        // column width = max(1, 5) = 5, header 'X' centered = '  X  '
        expect(result.table).toContain('  X  ');
    });

    it('returns correct width', () => {
        const result = fmtTable({
            headers: ['A'],
            rows: [['B']],
        });
        // width = colWidths.reduce((sum, w) => sum + w + 3, 1) = 1 + (1 + 3) = 5
        expect(result.width).toBe(5);
    });

    it('handles empty rows', () => {
        const result = fmtTable({ headers: ['Col'], rows: [] });
        expect(result.table).toContain('Col');
        expect(result.table.split('\n').length).toBeGreaterThanOrEqual(3);
    });

    it('uses empty string for missing cells', () => {
        const result = fmtTable({
            headers: ['A', 'B', 'C'],
            rows: [['only-a']],
        });
        expect(result.table).toContain('only-a');
    });
});

// ─── format brick ────────────────────────────────────────────────────────────

describe('format brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('format:json', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('format:yaml', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('format:markdown', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('format:table', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('format');
        expect(brick.manifest.prefix).toBe('fmt');
    });
});
