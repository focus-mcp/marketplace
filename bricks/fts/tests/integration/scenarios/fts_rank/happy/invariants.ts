/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, inputFiles: string[]): InvariantResult[] {
    return [
        inv.outputHasField(output, 'ranked'),
        (() => {
            const o = output as { ranked: unknown };
            if (!Array.isArray(o.ranked)) {
                return { ok: false, reason: 'output.ranked must be an array' };
            }
            if (o.ranked.length !== inputFiles.length) {
                return {
                    ok: false,
                    reason: `expected ${inputFiles.length} ranked items, got ${o.ranked.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { ranked: Array<{ file: string; score: number }> };
            if (!Array.isArray(o.ranked)) return { ok: true };
            for (const item of o.ranked) {
                if (typeof item.file !== 'string') {
                    return { ok: false, reason: 'ranked item must have a string "file" field' };
                }
                if (typeof item.score !== 'number') {
                    return { ok: false, reason: 'ranked item must have a number "score" field' };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
