/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

/** This scenario expects fo_delete to THROW when the path does not exist. */
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
            // stat() throws ENOENT before rm() is called
            if (!err.message.includes('ENOENT') && !err.message.includes('no such file')) {
                return {
                    ok: false,
                    reason: `error should mention ENOENT/no such file, got: ${err.message}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
