/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'result'),
        inv.outputHasField(output, 'operation'),
        (() => {
            const out = output as { result: unknown; operation: unknown };
            if (typeof out.result !== 'string') {
                return { ok: false, reason: 'output.result must be a string' };
            }
            if (out.result !== 'aGVsbG8=') {
                return {
                    ok: false,
                    reason: `expected base64("hello")="aGVsbG8=", got "${out.result}"`,
                };
            }
            if (out.operation !== 'base64encode') {
                return {
                    ok: false,
                    reason: `expected operation='base64encode', got ${String(out.operation)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
