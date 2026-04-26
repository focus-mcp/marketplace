/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { path?: unknown[]; length?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'path'),
        inv.outputHasField(output, 'length'),
        (() => {
            if (!Array.isArray(o.path) || o.path[0] !== 'a' || o.path[o.path.length - 1] !== 'c') {
                return {
                    ok: false,
                    reason: `expected path from 'a' to 'c', got ${JSON.stringify(o.path)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.length !== 2) {
                return { ok: false, reason: `expected length=2, got ${String(o.length)}` };
            }
            return { ok: true };
        })(),
    ];
}
