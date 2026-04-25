/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'formatted'),
        inv.outputHasField(output, 'lines'),
        (() => {
            const out = output as { formatted: unknown; lines: unknown };
            if (typeof out.formatted !== 'string') {
                return { ok: false, reason: 'output.formatted must be a string' };
            }
            let parsed: unknown;
            try {
                parsed = JSON.parse(out.formatted);
            } catch {
                return { ok: false, reason: 'output.formatted must be valid JSON' };
            }
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                return { ok: false, reason: 'parsed formatted output must be an object' };
            }
            const obj = parsed as Record<string, unknown>;
            if (obj['a'] !== 1) {
                return {
                    ok: false,
                    reason: `expected a=1 in formatted output, got ${String(obj['a'])}`,
                };
            }
            if (!Array.isArray(obj['b']) || obj['b'].length !== 2) {
                return { ok: false, reason: 'expected b=[2,3] in formatted output' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { lines: unknown };
            if (typeof out.lines !== 'number' || out.lines < 2) {
                return {
                    ok: false,
                    reason: 'output.lines must be >= 2 for multi-line pretty JSON',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
