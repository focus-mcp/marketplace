/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedInputTokens: number,
    expectedOutputTokens: number,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'inputCost'),
        inv.outputHasField(output, 'outputCost'),
        inv.outputHasField(output, 'totalCost'),
        inv.outputHasField(output, 'inputTokens'),
        inv.outputHasField(output, 'outputTokens'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { inputTokens: unknown };
            if (o.inputTokens !== expectedInputTokens) {
                return {
                    ok: false,
                    reason: `expected inputTokens=${expectedInputTokens}, got ${String(o.inputTokens)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { outputTokens: unknown };
            if (o.outputTokens !== expectedOutputTokens) {
                return {
                    ok: false,
                    reason: `expected outputTokens=${expectedOutputTokens}, got ${String(o.outputTokens)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { inputCost: unknown; outputCost: unknown; totalCost: unknown };
            if (typeof o.inputCost !== 'number' || o.inputCost < 0) {
                return { ok: false, reason: `expected inputCost>=0, got ${String(o.inputCost)}` };
            }
            if (typeof o.outputCost !== 'number' || o.outputCost < 0) {
                return { ok: false, reason: `expected outputCost>=0, got ${String(o.outputCost)}` };
            }
            if (typeof o.totalCost !== 'number' || o.totalCost < 0) {
                return { ok: false, reason: `expected totalCost>=0, got ${String(o.totalCost)}` };
            }
            const expectedTotal = (o.inputCost as number) + (o.outputCost as number);
            const diff = Math.abs((o.totalCost as number) - expectedTotal);
            if (diff > 1e-9) {
                return {
                    ok: false,
                    reason: `expected totalCost=inputCost+outputCost (${expectedTotal}), got ${String(o.totalCost)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
