/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedInput: number,
    expectedOutput: number,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'recorded'),
        inv.outputHasField(output, 'total'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { recorded: unknown };
            if (o.recorded !== true) {
                return { ok: false, reason: `expected recorded=true, got ${String(o.recorded)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                total: { inputTokens: unknown; outputTokens: unknown; tokens: unknown };
            };
            if (typeof o.total !== 'object' || o.total === null) {
                return { ok: false, reason: 'expected total to be an object' };
            }
            if (o.total.inputTokens !== expectedInput) {
                return {
                    ok: false,
                    reason: `expected total.inputTokens=${expectedInput}, got ${String(o.total.inputTokens)}`,
                };
            }
            if (o.total.outputTokens !== expectedOutput) {
                return {
                    ok: false,
                    reason: `expected total.outputTokens=${expectedOutput}, got ${String(o.total.outputTokens)}`,
                };
            }
            const expectedTokens = expectedInput + expectedOutput;
            if (o.total.tokens !== expectedTokens) {
                return {
                    ok: false,
                    reason: `expected total.tokens=${expectedTokens}, got ${String(o.total.tokens)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
