/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'tokensSaved'),
        inv.outputHasField(output, 'costSaved'),
        inv.outputHasField(output, 'timeOverhead'),
        inv.outputHasField(output, 'netBenefit'),
        (() => {
            const o = output as { tokensSaved: unknown };
            if (typeof o.tokensSaved !== 'number' || o.tokensSaved <= 0) {
                return {
                    ok: false,
                    reason: `expected tokensSaved > 0 after reports, got ${String(o.tokensSaved)}`,
                };
            }
            return { ok: true };
        })(),
        // costSaved is a positive number (USD)
        (() => {
            const o = output as { costSaved: unknown };
            if (typeof o.costSaved !== 'number' || o.costSaved <= 0) {
                return {
                    ok: false,
                    reason: `expected costSaved > 0, got ${String(o.costSaved)}`,
                };
            }
            return { ok: true };
        })(),
        // timeOverhead is a number (0 when no overheadMs supplied)
        (() => {
            const o = output as { timeOverhead: unknown };
            if (typeof o.timeOverhead !== 'number') {
                return {
                    ok: false,
                    reason: `expected timeOverhead to be a number, got ${typeof o.timeOverhead}`,
                };
            }
            return { ok: true };
        })(),
        // netBenefit is a number
        (() => {
            const o = output as { netBenefit: unknown };
            if (typeof o.netBenefit !== 'number') {
                return {
                    ok: false,
                    reason: `expected netBenefit to be a number, got ${typeof o.netBenefit}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
