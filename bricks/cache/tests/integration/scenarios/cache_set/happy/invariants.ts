/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'ok'),
        (() => {
            const o = output as { ok: unknown };
            if (o.ok !== true) {
                return { ok: false, reason: `expected ok=true, got ${String(o.ok)}` };
            }
            return { ok: true };
        })(),
    ];
}
