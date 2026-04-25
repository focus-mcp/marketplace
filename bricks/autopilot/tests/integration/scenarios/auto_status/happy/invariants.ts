/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedPlanId: string): InvariantResult[] {
    const o = output as {
        planId?: unknown;
        task?: unknown;
        totalSteps?: unknown;
        completed?: unknown;
        current?: unknown;
        nextStep?: unknown;
    };
    return [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'task'),
        inv.outputHasField(output, 'totalSteps'),
        inv.outputHasField(output, 'completed'),
        (() => {
            if (o.planId !== expectedPlanId) {
                return {
                    ok: false,
                    reason: `expected planId='${expectedPlanId}', got ${String(o.planId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.totalSteps !== 'number' || o.totalSteps < 1) {
                return {
                    ok: false,
                    reason: `expected totalSteps >= 1, got ${String(o.totalSteps)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.completed !== 'number' || o.completed < 1) {
                return {
                    ok: false,
                    reason: `expected completed >= 1 after execute, got ${String(o.completed)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const total = o.totalSteps as number;
            const completed = o.completed as number;
            if (completed > total) {
                return {
                    ok: false,
                    reason: `completed (${completed}) must not exceed totalSteps (${total})`,
                };
            }
            return { ok: true };
        })(),
    ];
}
