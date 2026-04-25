/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { describe, expect, it } from 'vitest';
import { outputSizeUnder } from '../../src/invariants/output-size.js';

describe('invariant outputSizeUnder', () => {
    it('passes when output serialises below the limit', () => {
        const check = outputSizeUnder(2048);
        const result = check({ ok: true, path: '/tmp/foo.txt' });
        expect(result.ok).toBe(true);
    });

    it('fails when output serialises above the limit', () => {
        const check = outputSizeUnder(10);
        const result = check({ message: 'this string is definitely longer than ten bytes' });
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/Output too large/);
        expect(result.reason).toMatch(/suspicious/);
    });

    it('reports exact byte count and threshold in reason string', () => {
        const check = outputSizeUnder(5);
        const output = { a: 1 };
        const size = JSON.stringify(output).length; // '{"a":1}' = 7 chars
        const result = check(output);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain(`${size}B`);
        expect(result.reason).toContain('5B');
    });

    it('passes for null and primitive outputs (edge-cases)', () => {
        const check = outputSizeUnder(100);
        expect(check(null).ok).toBe(true);
        expect(check(42).ok).toBe(true);
        expect(check('short').ok).toBe(true);
    });

    it('fails for a large nested object', () => {
        const check = outputSizeUnder(100);
        const big = { files: Array.from({ length: 50 }, (_, i) => `file-${i}.ts`) };
        const result = check(big);
        expect(result.ok).toBe(false);
    });
});
