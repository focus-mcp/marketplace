/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from './output-field.js';

/**
 * Asserts that a string field on the output is strictly shorter than `maxLength` characters.
 * Used to verify compression tools actually reduce content size.
 *
 * Usage:
 *   outputLengthLessThan('compressed', originalLength)(output)
 */
export function outputLengthLessThan(
    field: string,
    maxLength: number,
): (output: unknown) => InvariantResult {
    return (output: unknown): InvariantResult => {
        if (typeof output !== 'object' || output === null) {
            return { ok: false, reason: `output is not an object (got ${typeof output})` };
        }
        const value = (output as Record<string, unknown>)[field];
        if (typeof value !== 'string') {
            return {
                ok: false,
                reason: `field "${field}" is not a string (got ${typeof value})`,
            };
        }
        if (value.length >= maxLength) {
            return {
                ok: false,
                reason: `field "${field}" length ${value.length} is not less than ${maxLength}`,
            };
        }
        return { ok: true };
    };
}
