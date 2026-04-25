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
            if (!out.result.includes('a:')) {
                return {
                    ok: false,
                    reason: `expected YAML output to contain "a:", got: "${out.result}"`,
                };
            }
            if (!out.result.includes('1')) {
                return {
                    ok: false,
                    reason: `expected YAML output to contain "1", got: "${out.result}"`,
                };
            }
            if (out.from !== 'json') {
                return { ok: false, reason: `expected from='json', got ${String(out.from)}` };
            }
            if (out.to !== 'yaml') {
                return { ok: false, reason: `expected to='yaml', got ${String(out.to)}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
