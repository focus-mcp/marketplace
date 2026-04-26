/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedExports: string[]): InvariantResult[] {
    const o = output as { exports?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'exports'),
        (() => {
            if (!Array.isArray(o.exports)) {
                return { ok: false, reason: 'exports must be an array' };
            }
            return { ok: true };
        })(),
        ...expectedExports.map((name) =>
            (() => {
                if (!Array.isArray(o.exports) || !o.exports.includes(name)) {
                    return {
                        ok: false,
                        reason: `expected export '${name}' not found in ${JSON.stringify(o.exports)}`,
                    };
                }
                return { ok: true };
            })(),
        ),
    ];
}
