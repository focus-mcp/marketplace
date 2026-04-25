/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

/** This scenario expects the tool to THROW. Invariants are checked on the caught error. */
export function checkError(err: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(err instanceof Error)) {
                return { ok: false, reason: 'expected an Error to be thrown' };
            }
            return { ok: true };
        })(),
        (() => {
            if (!(err instanceof Error)) return { ok: false, reason: 'not an Error' };
            if (!err.message.includes('already exists')) {
                return {
                    ok: false,
                    reason: `error message should mention 'already exists', got: ${err.message}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
