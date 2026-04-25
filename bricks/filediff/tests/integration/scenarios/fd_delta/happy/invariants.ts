/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'delta'),
        (() => {
            const delta = (output as { delta: unknown }).delta;
            if (!Array.isArray(delta)) {
                return { ok: false, reason: 'output.delta must be an array' };
            }
            if (delta.length === 0) {
                return { ok: false, reason: 'expected non-empty delta for differing strings' };
            }
            return { ok: true };
        })(),
        (() => {
            const delta = (output as { delta: unknown[] }).delta;
            if (!Array.isArray(delta)) return { ok: true }; // already checked
            const hasRemoved = delta.some((l) => typeof l === 'string' && l.startsWith('-'));
            const hasAdded = delta.some((l) => typeof l === 'string' && l.startsWith('+'));
            if (!hasRemoved || !hasAdded) {
                return {
                    ok: false,
                    reason: `expected both removed (-) and added (+) lines in delta, got: ${JSON.stringify(delta)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
