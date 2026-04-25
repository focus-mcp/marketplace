/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from './output-field.js';

/**
 * Asserts the serialised size of the tool output is below `maxBytes`.
 * Catches "output bloat" bugs where a tool leaks file content, directory
 * listings, or other large payloads instead of a compact status response.
 *
 * Usage:
 *   outputSizeUnder(2048)(output)
 */
export function outputSizeUnder(maxBytes: number): (output: unknown) => InvariantResult {
    return (output: unknown): InvariantResult => {
        const size = JSON.stringify(output).length;
        if (size > maxBytes) {
            return {
                ok: false,
                reason: `Output too large: ${size}B > ${maxBytes}B (suspicious — tool may leak data)`,
            };
        }
        return { ok: true };
    };
}
