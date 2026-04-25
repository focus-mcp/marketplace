/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function isIntentScore(val: unknown): val is { label: string; score: number } {
    return (
        typeof val === 'object' &&
        val !== null &&
        typeof (val as { label?: unknown }).label === 'string' &&
        typeof (val as { score?: unknown }).score === 'number'
    );
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'bestIntent'),
        inv.outputHasField(output, 'scores'),
        (() => {
            const out = output as { bestIntent: unknown };
            if (typeof out.bestIntent !== 'string' || out.bestIntent.length === 0) {
                return { ok: false, reason: 'bestIntent must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { scores: unknown };
            if (!Array.isArray(out.scores)) {
                return { ok: false, reason: 'scores must be an array' };
            }
            if (out.scores.length !== 3) {
                return { ok: false, reason: `expected 3 intent scores, got ${out.scores.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { scores: unknown[] };
            if (!Array.isArray(out.scores)) return { ok: true };
            for (const s of out.scores) {
                if (!isIntentScore(s)) {
                    return {
                        ok: false,
                        reason: 'each score must have label (string) and score (number)',
                    };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { bestIntent: string };
            if (out.bestIntent !== 'login_help') {
                return {
                    ok: false,
                    reason: `expected bestIntent="login_help", got "${out.bestIntent}"`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
