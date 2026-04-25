/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

/**
 * Must not error on an empty directory; must return an empty array explicitly.
 * Adapt to the brick's actual output shape: it uses `matches` (not `files`) per T11 finding.
 */
export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'matches'),
        (() => {
            const matches = (output as { matches: unknown }).matches;
            if (!Array.isArray(matches)) return { ok: false, reason: 'matches must be array' };
            if (matches.length !== 0)
                return { ok: false, reason: `expected 0 matches, got ${matches.length}` };
            return { ok: true };
        })(),
    ];
}
