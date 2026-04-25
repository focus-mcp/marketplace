/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

export function check(error: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(error instanceof Error)) {
                return {
                    ok: false,
                    reason: 'expected an Error to be thrown for incompatible units',
                };
            }
            if (!error.message.includes('Unsupported unit conversion')) {
                return {
                    ok: false,
                    reason: `expected "Unsupported unit conversion" in error message, got: ${error.message}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
