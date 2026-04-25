/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'decisionId'),
        inv.outputHasField(output, 'question'),
        inv.outputHasField(output, 'optionCount'),
        (() => {
            const o = output as { decisionId: unknown };
            if (typeof o.decisionId !== 'string' || o.decisionId.length === 0) {
                return {
                    ok: false,
                    reason: `expected decisionId to be a non-empty string, got ${String(o.decisionId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { question: unknown };
            if (o.question !== 'Which database should we use?') {
                return {
                    ok: false,
                    reason: `expected question='Which database should we use?', got ${String(o.question)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { optionCount: unknown };
            if (o.optionCount !== 3) {
                return {
                    ok: false,
                    reason: `expected optionCount=3, got ${String(o.optionCount)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
