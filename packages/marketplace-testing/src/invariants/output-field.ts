/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

export interface InvariantResult {
    ok: boolean;
    reason?: string;
}

/**
 * Asserts the tool output is an object and has a given field.
 * Used to catch silent success bugs where a tool forgets to report status.
 */
export function outputHasField(output: unknown, field: string): InvariantResult {
    if (typeof output !== 'object' || output === null) {
        return { ok: false, reason: `output is not an object (got ${typeof output})` };
    }
    if (!(field in output)) {
        return { ok: false, reason: `field "${field}" missing from output` };
    }
    return { ok: true };
}
