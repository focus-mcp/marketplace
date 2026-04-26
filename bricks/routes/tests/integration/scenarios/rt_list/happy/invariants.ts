/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { table?: unknown; total?: unknown };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'table'),
        inv.outputHasField(output, 'total'),
        (() => {
            if (o.total !== 2) {
                return { ok: false, reason: `expected total=2, got ${String(o.total)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (
                typeof o.table !== 'string' ||
                !o.table.includes('METHOD') ||
                !o.table.includes('PATH')
            ) {
                return {
                    ok: false,
                    reason: `table must contain 'METHOD' and 'PATH' headers, got ${String(o.table).slice(0, 100)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
