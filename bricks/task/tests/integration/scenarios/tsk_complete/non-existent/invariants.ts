/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

export function check(error: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(error instanceof Error)) {
                return { ok: false, reason: `expected an Error to be thrown, got ${typeof error}` };
            }
            if (!error.message.includes('not found') && !error.message.includes('Task not found')) {
                return {
                    ok: false,
                    reason: `expected error message to mention 'not found', got: "${error.message}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
