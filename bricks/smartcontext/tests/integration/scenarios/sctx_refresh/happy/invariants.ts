/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'changed'),
        inv.outputHasField(output, 'refreshed'),
        inv.outputHasField(output, 'tokensUsed'),
        (() => {
            const out = output as { changed: unknown; refreshed: unknown; tokensUsed: unknown };
            const checks: Array<[string, unknown]> = [
                ['changed', out.changed],
                ['refreshed', out.refreshed],
                ['tokensUsed', out.tokensUsed],
            ];
            for (const [field, val] of checks) {
                if (typeof val !== 'number') {
                    return { ok: false, reason: `field "${field}" must be a number` };
                }
                if (val < 0) {
                    return { ok: false, reason: `field "${field}" must be >= 0, got ${val}` };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
