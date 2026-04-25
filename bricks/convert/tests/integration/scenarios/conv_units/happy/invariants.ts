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
        inv.outputHasField(output, 'formatted'),
        (() => {
            const out = output as { result: unknown; from: unknown; to: unknown };
            if (typeof out.result !== 'number') {
                return { ok: false, reason: 'output.result must be a number' };
            }
            if (out.result !== 102400) {
                return {
                    ok: false,
                    reason: `expected result=102400 (100 MB → KB), got ${out.result}`,
                };
            }
            if (out.from !== 'mb') {
                return { ok: false, reason: `expected from='mb', got ${String(out.from)}` };
            }
            if (out.to !== 'kb') {
                return { ok: false, reason: `expected to='kb', got ${String(out.to)}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
