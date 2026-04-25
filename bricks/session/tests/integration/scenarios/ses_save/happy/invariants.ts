/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'ok'),
        inv.outputHasField(output, 'path'),
        (() => {
            const o = output as { ok: unknown };
            if (o.ok !== true) {
                return { ok: false, reason: `expected ok=true, got ${String(o.ok)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { path: unknown };
            if (typeof o.path !== 'string' || o.path.length === 0) {
                return {
                    ok: false,
                    reason: `expected path to be a non-empty string, got ${String(o.path)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
