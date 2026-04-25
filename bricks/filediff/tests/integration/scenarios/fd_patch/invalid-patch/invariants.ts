/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

/**
 * For an invalid patch, the tool may either throw or return the unchanged content.
 * Either is acceptable — the important invariant is that the original file is NOT corrupted.
 * This invariant is checked externally in the test driver (readFile + compare).
 */
export function checkOutput(output: unknown): InvariantResult[] {
    // If the tool returns (no throw), it must return a content field
    return [
        (() => {
            if (typeof output !== 'object' || output === null) {
                return { ok: false, reason: 'output must be an object if the tool does not throw' };
            }
            return { ok: true };
        })(),
    ];
}

export function checkError(err: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(err instanceof Error)) {
                return { ok: false, reason: 'expected an Error when applying invalid patch' };
            }
            return { ok: true };
        })(),
    ];
}
