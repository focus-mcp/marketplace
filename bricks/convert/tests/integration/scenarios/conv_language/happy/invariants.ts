/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'result'),
        inv.outputHasField(output, 'from'),
        inv.outputHasField(output, 'to'),
        (() => {
            const out = output as { result: unknown; from: unknown; to: unknown };
            if (typeof out.result !== 'string') {
                return { ok: false, reason: 'output.result must be a string' };
            }
            if (out.result !== 'my_variable_name') {
                return {
                    ok: false,
                    reason: `expected camelCase→snake="my_variable_name", got "${out.result}"`,
                };
            }
            if (out.to !== 'snake') {
                return { ok: false, reason: `expected to='snake', got ${String(out.to)}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
