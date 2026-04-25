/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'packed'),
        inv.outputHasField(output, 'included'),
        inv.outputHasField(output, 'excluded'),
        inv.outputHasField(output, 'tokensUsed'),
        (() => {
            const out = output as {
                packed: unknown;
                included: unknown;
                excluded: unknown;
                tokensUsed: unknown;
            };
            if (typeof out.tokensUsed !== 'number') {
                return { ok: false, reason: 'output.tokensUsed must be a number' };
            }
            if (out.tokensUsed > 5000) {
                return {
                    ok: false,
                    reason: `tokensUsed=${out.tokensUsed} exceeds budget=5000`,
                };
            }
            if (!Array.isArray(out.included)) {
                return { ok: false, reason: 'output.included must be an array' };
            }
            if (out.included.length === 0) {
                return { ok: false, reason: 'expected at least 1 file included within budget' };
            }
            if (!Array.isArray(out.excluded)) {
                return { ok: false, reason: 'output.excluded must be an array' };
            }
            if (out.included.length + out.excluded.length !== 3) {
                return {
                    ok: false,
                    reason: `included(${out.included.length}) + excluded(${out.excluded.length}) must equal 3`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(65536)(output),
    ];
}
