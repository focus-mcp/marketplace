/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'title'),
        (() => {
            const o = output as { planId: unknown };
            if (typeof o.planId !== 'string' || o.planId.length === 0) {
                return {
                    ok: false,
                    reason: `expected planId to be a non-empty string, got ${String(o.planId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { title: unknown };
            if (o.title !== 'Build new feature') {
                return {
                    ok: false,
                    reason: `expected title='Build new feature', got ${String(o.title)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
