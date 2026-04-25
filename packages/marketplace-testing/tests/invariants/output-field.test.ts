/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { describe, expect, it } from 'vitest';
import { outputHasField } from '../../src/invariants/output-field.js';

describe('invariant outputHasField', () => {
    it('passes when the output has the required field', () => {
        const result = outputHasField({ inserted: true, line: 42 }, 'inserted');
        expect(result.ok).toBe(true);
    });

    it('fails with descriptive message when field is missing', () => {
        const result = outputHasField({ line: 42 }, 'inserted');
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/field "inserted" missing/i);
    });

    it('fails when output is not an object', () => {
        const result = outputHasField('bad', 'inserted');
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/not an object/i);
    });
});
