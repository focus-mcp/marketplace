/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCallees: string[]): InvariantResult[] {
    const o = output as { callees?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'callees'),
        (() => {
            if (!Array.isArray(o.callees)) {
                return { ok: false, reason: 'callees must be an array' };
            }
            return { ok: true };
        })(),
        ...expectedCallees.map((name) =>
            (() => {
                if (!Array.isArray(o.callees) || !o.callees.includes(name)) {
                    return {
                        ok: false,
                        reason: `expected callee '${name}' not found in ${JSON.stringify(o.callees)}`,
                    };
                }
                return { ok: true };
            })(),
        ),
    ];
}
