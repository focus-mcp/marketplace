/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { callers?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'callers'),
        (() => {
            if (!Array.isArray(o.callers) || o.callers.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least 1 caller, got ${String(o.callers?.length ?? 0)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const first = o.callers?.[0] as
                | { file?: unknown; line?: unknown; snippet?: unknown }
                | undefined;
            if (
                !first ||
                typeof first.file !== 'string' ||
                typeof first.line !== 'number' ||
                typeof first.snippet !== 'string'
            ) {
                return { ok: false, reason: 'caller entry missing file/line/snippet fields' };
            }
            return { ok: true };
        })(),
    ];
}
