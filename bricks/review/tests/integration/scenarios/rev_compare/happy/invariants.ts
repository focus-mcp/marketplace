/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'additions'),
        inv.outputHasField(output, 'removals'),
        inv.outputHasField(output, 'modifications'),
        inv.outputHasField(output, 'similarity'),
        (() => {
            const o = output as { additions: unknown };
            if (!Array.isArray(o.additions)) {
                return { ok: false, reason: 'output.additions must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { removals: unknown };
            if (!Array.isArray(o.removals)) {
                return { ok: false, reason: 'output.removals must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { similarity: unknown };
            if (typeof o.similarity !== 'number' || o.similarity < 0 || o.similarity > 1) {
                return { ok: false, reason: `expected similarity in [0,1], got ${o.similarity}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { similarity: number };
            if (o.similarity >= 1) {
                return {
                    ok: false,
                    reason: 'expected similarity < 1 for two different file versions',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                additions: unknown[];
                removals: unknown[];
                modifications: unknown[];
            };
            const totalChanges =
                (o.additions?.length ?? 0) +
                (o.removals?.length ?? 0) +
                (o.modifications?.length ?? 0);
            if (totalChanges === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one change (addition, removal, or modification)',
                };
            }
            return { ok: true };
        })(),
    ];
}
