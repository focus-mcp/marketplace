/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'chainId'),
        inv.outputHasField(output, 'stepIndex'),
        inv.outputHasField(output, 'totalSteps'),
        (() => {
            const o = output as { chainId: unknown };
            if (typeof o.chainId !== 'string' || o.chainId.length === 0) {
                return {
                    ok: false,
                    reason: `expected chainId to be a non-empty string, got ${String(o.chainId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { stepIndex: unknown };
            if (o.stepIndex !== 0) {
                return {
                    ok: false,
                    reason: `expected stepIndex=0 (first step), got ${String(o.stepIndex)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { totalSteps: unknown };
            if (o.totalSteps !== 1) {
                return {
                    ok: false,
                    reason: `expected totalSteps=1, got ${String(o.totalSteps)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
