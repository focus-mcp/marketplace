/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'filesLoaded'),
        inv.outputHasField(output, 'tokensUsed'),
        inv.outputHasField(output, 'cacheHits'),
        inv.outputHasField(output, 'cacheMisses'),
        (() => {
            const out = output as {
                filesLoaded: unknown;
                tokensUsed: unknown;
                cacheHits: unknown;
                cacheMisses: unknown;
            };
            for (const [field, val] of Object.entries(out)) {
                if (typeof val !== 'number') {
                    return { ok: false, reason: `field "${field}" must be a number` };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { filesLoaded: number };
            if (out.filesLoaded < 0) {
                return { ok: false, reason: `filesLoaded must be >= 0, got ${out.filesLoaded}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
