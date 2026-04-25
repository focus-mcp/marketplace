/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, prefix: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'suggestions'),
        (() => {
            const o = output as { suggestions: unknown };
            if (!Array.isArray(o.suggestions)) {
                return { ok: false, reason: 'output.suggestions must be an array' };
            }
            if (o.suggestions.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least one suggestion for prefix "${prefix}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { suggestions: Array<{ term: string; documentCount: number }> };
            if (!Array.isArray(o.suggestions)) return { ok: true };
            const lowerPrefix = prefix.toLowerCase();
            for (const s of o.suggestions) {
                if (typeof s.term !== 'string') {
                    return { ok: false, reason: 'suggestion must have a string "term" field' };
                }
                if (!s.term.startsWith(lowerPrefix)) {
                    return {
                        ok: false,
                        reason: `suggestion "${s.term}" does not start with prefix "${lowerPrefix}"`,
                    };
                }
                if (typeof s.documentCount !== 'number' || s.documentCount <= 0) {
                    return {
                        ok: false,
                        reason: `suggestion "${s.term}" must have documentCount > 0`,
                    };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
