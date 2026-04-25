/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'startedAt'),
        inv.outputHasField(output, 'toolCalls'),
        inv.outputHasField(output, 'totalTokens'),
        inv.outputHasField(output, 'totalDuration'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { startedAt: unknown };
            if (typeof o.startedAt !== 'number' || o.startedAt <= 0) {
                return { ok: false, reason: `expected startedAt>0, got ${String(o.startedAt)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { toolCalls: unknown };
            if (o.toolCalls !== 0) {
                return { ok: false, reason: `expected toolCalls=0, got ${String(o.toolCalls)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { totalTokens: unknown };
            if (o.totalTokens !== 0) {
                return {
                    ok: false,
                    reason: `expected totalTokens=0, got ${String(o.totalTokens)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { totalDuration: unknown };
            if (o.totalDuration !== 0) {
                return {
                    ok: false,
                    reason: `expected totalDuration=0, got ${String(o.totalDuration)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
