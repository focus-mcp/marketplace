/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'lines'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['lines'])) {
                return { ok: false, reason: 'lines must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const lines = (out['lines'] as unknown[]) ?? [];
            const allExported = lines.every(
                (l) => typeof l === 'string' && l.trimStart().startsWith('export '),
            );
            if (lines.length > 0 && !allExported) {
                return {
                    ok: false,
                    reason: 'sr_signatures should only return exported declarations',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
