/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

/**
 * Invariants for fl_glob / happy scenario.
 * The brick returns { matches: [] } for packages/core because that directory
 * contains no *.module.ts files. Invariants verify structural correctness.
 */
export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'matches'),
        // Output must be an object with a matches array (may be empty)
        (() => {
            if (typeof output !== 'object' || output === null || !('matches' in output)) {
                return { ok: false, reason: 'output.matches missing' };
            }
            const matches = (output as { matches: unknown }).matches;
            if (!Array.isArray(matches)) {
                return {
                    ok: false,
                    reason: 'output.matches must be an array',
                };
            }
            return { ok: true };
        })(),
        // Every match, if any, must end in .module.ts
        (() => {
            const matches = (output as { matches: string[] }).matches;
            if (!Array.isArray(matches)) {
                return { ok: false, reason: 'output.matches is not an array' };
            }
            const bad = matches.filter((f) => !f.endsWith('.module.ts'));
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `non-matching files in output: ${bad.slice(0, 3).join(', ')}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
