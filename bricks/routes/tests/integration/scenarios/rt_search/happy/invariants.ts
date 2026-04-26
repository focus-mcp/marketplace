/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { routes?: unknown[]; total?: unknown };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'routes'),
        inv.outputHasField(output, 'total'),
        (() => {
            if (o.total !== 2) {
                return { ok: false, reason: `expected total=2, got ${String(o.total)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.routes)) return { ok: false, reason: 'routes must be array' };
            const allMatch = o.routes.every((r: unknown) => {
                const route = r as { path?: unknown };
                return typeof route.path === 'string' && route.path.includes('/users');
            });
            if (!allMatch) {
                return { ok: false, reason: `all routes must contain '/users'` };
            }
            return { ok: true };
        })(),
    ];
}
