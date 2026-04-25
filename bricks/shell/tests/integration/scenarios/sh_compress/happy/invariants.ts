/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'output'),
        inv.outputHasField(output, 'lines'),
        inv.outputHasField(output, 'truncated'),
        inv.outputSizeUnder(4096)(output),
        (() => {
            const o = output as { output: unknown };
            if (typeof o.output !== 'string') {
                return { ok: false, reason: 'expected output to be a string' };
            }
            if (o.output.length === 0) {
                return { ok: false, reason: 'expected output to be non-empty' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { lines: unknown };
            if (typeof o.lines !== 'number' || o.lines <= 0) {
                return {
                    ok: false,
                    reason: `expected lines > 0, got ${String(o.lines)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { truncated: unknown };
            if (o.truncated !== false) {
                return {
                    ok: false,
                    reason: `expected truncated=false for 3-line output, got ${String(o.truncated)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
