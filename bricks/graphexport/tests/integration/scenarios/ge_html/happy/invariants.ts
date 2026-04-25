/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    // ge_html returns a string directly
    return [
        (() => {
            if (typeof output !== 'string') {
                return { ok: false, reason: `expected string output, got ${typeof output}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('<!DOCTYPE html>')) {
                return {
                    ok: false,
                    reason: `expected HTML output to contain '<!DOCTYPE html>'`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('NodeA')) {
                return {
                    ok: false,
                    reason: `expected HTML output to contain node label 'NodeA'`,
                };
            }
            return { ok: true };
        })(),
        // outputSizeUnder: 8192 bytes — measured at 2020B for 5 nodes, well within budget
        inv.outputSizeUnder(8192)(output),
    ];
}
