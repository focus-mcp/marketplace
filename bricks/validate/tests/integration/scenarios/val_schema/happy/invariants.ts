/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { valid?: unknown; errors?: unknown[] };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'valid'),
        inv.outputHasField(output, 'errors'),
        (() => {
            if (o.valid !== true) {
                return { ok: false, reason: `expected valid=true, got ${String(o.valid)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.errors) || o.errors.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty errors, got ${JSON.stringify(o.errors)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
