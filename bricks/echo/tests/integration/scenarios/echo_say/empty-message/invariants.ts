/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { message?: unknown };
    return [
        inv.outputHasField(output, 'message'),
        inv.outputSizeUnder(1024)(output),
        (() => {
            if (o.message !== '') {
                return {
                    ok: false,
                    reason: `expected message='', got ${String(o.message)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
