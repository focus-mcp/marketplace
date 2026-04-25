/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'issues'),
        inv.outputHasField(output, 'valid'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as { issues: unknown };
            if (!Array.isArray(o.issues)) {
                return {
                    ok: false,
                    reason: `expected issues to be an array, got ${typeof o.issues}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { valid: unknown };
            if (typeof o.valid !== 'boolean') {
                return {
                    ok: false,
                    reason: `expected valid to be a boolean, got ${typeof o.valid}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { issues: unknown[]; valid: boolean };
            if (!Array.isArray(o.issues)) return { ok: true };
            // One-way implication: issues present → cannot be valid
            // (valid:false with empty issues is tolerable, e.g. warnings without captured issues)
            const consistent = o.issues.length === 0 || !o.valid;
            if (!consistent) {
                return {
                    ok: false,
                    reason: `valid=${String(o.valid)} but issues.length=${o.issues.length} — inconsistent`,
                };
            }
            return { ok: true };
        })(),
    ];
}
