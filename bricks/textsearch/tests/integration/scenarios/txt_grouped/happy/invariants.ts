/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function isGroupEntry(val: unknown): val is { file: string; count: number; lines: number[] } {
    return (
        typeof val === 'object' &&
        val !== null &&
        typeof (val as { file?: unknown }).file === 'string' &&
        typeof (val as { count?: unknown }).count === 'number' &&
        Array.isArray((val as { lines?: unknown }).lines)
    );
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'groups'),
        inv.outputHasField(output, 'totalFiles'),
        inv.outputHasField(output, 'totalMatches'),
        (() => {
            const out = output as { groups: unknown };
            if (!Array.isArray(out.groups)) {
                return { ok: false, reason: 'output.groups must be an array' };
            }
            if (out.groups.length === 0) {
                return { ok: false, reason: 'expected at least 1 group for "Injectable"' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { groups: unknown[] };
            if (!Array.isArray(out.groups)) return { ok: true };
            for (const g of out.groups) {
                if (!isGroupEntry(g)) {
                    return {
                        ok: false,
                        reason: 'each group must have file (string), count (number), lines (array)',
                    };
                }
                if (g.count < 1) {
                    return {
                        ok: false,
                        reason: `group "${g.file}" has count=${g.count}, expected >= 1`,
                    };
                }
                if (g.lines.length === 0) {
                    return {
                        ok: false,
                        reason: `group "${g.file}" has empty lines array`,
                    };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { totalMatches: unknown };
            if (typeof out.totalMatches !== 'number' || out.totalMatches < 1) {
                return { ok: false, reason: 'totalMatches must be >= 1' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
