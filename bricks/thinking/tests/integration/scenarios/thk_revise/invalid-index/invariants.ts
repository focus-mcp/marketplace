/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

export function checkThrows(error: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(error instanceof Error)) {
                return {
                    ok: false,
                    reason: `expected an Error to be thrown, got ${typeof error}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!(error instanceof Error)) return { ok: true }; // already failed above
            const msg = error.message.toLowerCase();
            const mentionsStep =
                msg.includes('step') || msg.includes('99') || msg.includes('not found');
            if (!mentionsStep) {
                return {
                    ok: false,
                    reason: `expected error message to reference step or index, got: "${error.message}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
