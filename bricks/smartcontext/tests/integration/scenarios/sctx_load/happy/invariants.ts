/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'context'),
        inv.outputHasField(output, 'tokensUsed'),
        inv.outputHasField(output, 'budget'),
        inv.outputHasField(output, 'filesIncluded'),
        inv.outputHasField(output, 'mode'),
        (() => {
            const out = output as { context: unknown };
            if (typeof out.context !== 'string') {
                return { ok: false, reason: 'context must be a string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { tokensUsed: unknown };
            if (typeof out.tokensUsed !== 'number') {
                return { ok: false, reason: 'tokensUsed must be a number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { budget: unknown };
            if (typeof out.budget !== 'number' || out.budget <= 0) {
                return { ok: false, reason: 'budget must be a positive number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { filesIncluded: unknown };
            if (typeof out.filesIncluded !== 'number') {
                return { ok: false, reason: 'filesIncluded must be a number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { mode: unknown };
            if (typeof out.mode !== 'string' || out.mode.length === 0) {
                return { ok: false, reason: 'mode must be a non-empty string' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
