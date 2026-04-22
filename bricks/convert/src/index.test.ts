// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { convEncoding, convFormat, convLanguage, convUnits } from './operations.ts';

// ─── convUnits ────────────────────────────────────────────────────────────────

describe('convUnits — bytes', () => {
    it('converts bytes to kilobytes', () => {
        const out = convUnits({ value: 1024, from: 'b', to: 'kb' });
        expect(out.result).toBe(1);
        expect(out.formatted).toBe('1 KB');
    });

    it('converts MB to GB', () => {
        const out = convUnits({ value: 2048, from: 'mb', to: 'gb' });
        expect(out.result).toBeCloseTo(2);
        expect(out.formatted).toContain('GB');
    });

    it('converts GB to bytes', () => {
        const out = convUnits({ value: 1, from: 'gb', to: 'b' });
        expect(out.result).toBe(1073741824);
    });
});

describe('convUnits — time', () => {
    it('converts milliseconds to seconds', () => {
        const out = convUnits({ value: 5000, from: 'ms', to: 's' });
        expect(out.result).toBe(5);
        expect(out.formatted).toBe('5 s');
    });

    it('converts hours to minutes', () => {
        const out = convUnits({ value: 2, from: 'h', to: 'm' });
        expect(out.result).toBe(120);
    });

    it('converts seconds to milliseconds', () => {
        const out = convUnits({ value: 1, from: 's', to: 'ms' });
        expect(out.result).toBe(1000);
    });
});

describe('convUnits — tokens', () => {
    it('converts tokens to cost', () => {
        const out = convUnits({ value: 1_000_000, from: 'tokens', to: 'cost', pricePerMillion: 3 });
        expect(out.result).toBeCloseTo(3);
        expect(out.formatted).toBe('$3.000000');
    });

    it('uses 0 cost when pricePerMillion is not provided', () => {
        const out = convUnits({ value: 500_000, from: 'tokens', to: 'cost' });
        expect(out.result).toBe(0);
    });
});

describe('convUnits — errors', () => {
    it('throws on unsupported conversion', () => {
        expect(() => convUnits({ value: 1, from: 'kb', to: 'ms' })).toThrow();
    });
});

// ─── convEncoding ─────────────────────────────────────────────────────────────

describe('convEncoding — base64', () => {
    it('encodes to base64', () => {
        const out = convEncoding({ text: 'hello', operation: 'base64encode' });
        expect(out.result).toBe('aGVsbG8=');
        expect(out.operation).toBe('base64encode');
    });

    it('decodes from base64', () => {
        const out = convEncoding({ text: 'aGVsbG8=', operation: 'base64decode' });
        expect(out.result).toBe('hello');
    });

    it('roundtrips base64', () => {
        const original = 'FocusMCP rocks!';
        const encoded = convEncoding({ text: original, operation: 'base64encode' });
        const decoded = convEncoding({ text: encoded.result, operation: 'base64decode' });
        expect(decoded.result).toBe(original);
    });
});

describe('convEncoding — hex', () => {
    it('encodes to hex', () => {
        const out = convEncoding({ text: 'abc', operation: 'hexencode' });
        expect(out.result).toBe('616263');
    });

    it('decodes from hex', () => {
        const out = convEncoding({ text: '616263', operation: 'hexdecode' });
        expect(out.result).toBe('abc');
    });
});

describe('convEncoding — URL', () => {
    it('encodes URL', () => {
        const out = convEncoding({ text: 'hello world', operation: 'urlencode' });
        expect(out.result).toBe('hello%20world');
    });

    it('decodes URL', () => {
        const out = convEncoding({ text: 'hello%20world', operation: 'urldecode' });
        expect(out.result).toBe('hello world');
    });
});

describe('convEncoding — HTML', () => {
    it('escapes HTML entities', () => {
        const out = convEncoding({
            text: '<script>alert("xss")</script>',
            operation: 'htmlescape',
        });
        expect(out.result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('unescapes HTML entities', () => {
        const out = convEncoding({
            text: '&lt;b&gt;bold&lt;/b&gt;',
            operation: 'htmlunescape',
        });
        expect(out.result).toBe('<b>bold</b>');
    });

    it('roundtrips HTML', () => {
        const original = '<p>Hello & "world"!</p>';
        const escaped = convEncoding({ text: original, operation: 'htmlescape' });
        const unescaped = convEncoding({ text: escaped.result, operation: 'htmlunescape' });
        expect(unescaped.result).toBe(original);
    });
});

// ─── convFormat ───────────────────────────────────────────────────────────────

describe('convFormat — JSON → CSV', () => {
    it('converts JSON array to CSV', () => {
        const data = JSON.stringify([
            { name: 'Alice', age: '30' },
            { name: 'Bob', age: '25' },
        ]);
        const out = convFormat({ data, from: 'json', to: 'csv' });
        expect(out.result).toContain('name,age');
        expect(out.result).toContain('Alice');
        expect(out.result).toContain('Bob');
    });
});

describe('convFormat — CSV → JSON', () => {
    it('converts CSV to JSON array', () => {
        const data = 'name,age\nAlice,30\nBob,25';
        const out = convFormat({ data, from: 'csv', to: 'json' });
        const parsed: unknown = JSON.parse(out.result);
        expect(Array.isArray(parsed)).toBe(true);
        expect((parsed as Array<Record<string, string>>)[0]?.['name']).toBe('Alice');
    });
});

describe('convFormat — JSON → YAML', () => {
    it('converts simple JSON object to YAML', () => {
        const data = JSON.stringify({ name: 'focus', version: '1.0' });
        const out = convFormat({ data, from: 'json', to: 'yaml' });
        expect(out.result).toContain('name: focus');
        expect(out.result).toContain('version: 1');
    });
});

describe('convFormat — CSV → YAML', () => {
    it('converts CSV to YAML list', () => {
        const data = 'a,b\n1,2';
        const out = convFormat({ data, from: 'csv', to: 'yaml' });
        expect(out.result).toContain('a: 1');
        expect(out.result).toContain('b: 2');
    });
});

describe('convFormat — same format', () => {
    it('returns data unchanged when from === to', () => {
        const data = '{"x":1}';
        const out = convFormat({ data, from: 'json', to: 'json' });
        expect(out.result).toBe(data);
    });
});

describe('convFormat — errors', () => {
    it('throws on invalid JSON input', () => {
        expect(() => convFormat({ data: 'not json', from: 'json', to: 'csv' })).toThrow();
    });
});

// ─── convLanguage ─────────────────────────────────────────────────────────────

describe('convLanguage — to snake_case', () => {
    it('converts camelCase to snake_case', () => {
        const out = convLanguage({ text: 'myVariableName', to: 'snake' });
        expect(out.result).toBe('my_variable_name');
        expect(out.from).toBe('camel');
    });

    it('converts PascalCase to snake_case', () => {
        const out = convLanguage({ text: 'MyVariableName', to: 'snake' });
        expect(out.result).toBe('my_variable_name');
    });

    it('converts kebab-case to snake_case', () => {
        const out = convLanguage({ text: 'my-variable-name', to: 'snake' });
        expect(out.result).toBe('my_variable_name');
        expect(out.from).toBe('kebab');
    });
});

describe('convLanguage — to camelCase', () => {
    it('converts snake_case to camelCase', () => {
        const out = convLanguage({ text: 'my_variable_name', to: 'camel' });
        expect(out.result).toBe('myVariableName');
        expect(out.from).toBe('snake');
    });

    it('converts kebab-case to camelCase', () => {
        const out = convLanguage({ text: 'my-variable-name', to: 'camel' });
        expect(out.result).toBe('myVariableName');
    });
});

describe('convLanguage — to PascalCase', () => {
    it('converts snake_case to PascalCase', () => {
        const out = convLanguage({ text: 'my_variable_name', to: 'pascal' });
        expect(out.result).toBe('MyVariableName');
    });
});

describe('convLanguage — to kebab-case', () => {
    it('converts camelCase to kebab-case', () => {
        const out = convLanguage({ text: 'myVariableName', to: 'kebab' });
        expect(out.result).toBe('my-variable-name');
    });

    it('converts PascalCase to kebab-case', () => {
        const out = convLanguage({ text: 'MyVariableName', to: 'kebab' });
        expect(out.result).toBe('my-variable-name');
    });
});

// ─── Brick registration ───────────────────────────────────────────────────────

describe('convert brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('convert:units', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('convert:encoding', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('convert:format', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('convert:language', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes manifest with correct name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('convert');
        expect(brick.manifest.prefix).toBe('conv');
        expect(brick.manifest.tools).toHaveLength(4);
    });
});
