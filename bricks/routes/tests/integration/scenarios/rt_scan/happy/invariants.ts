/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { routes?: unknown[]; framework?: unknown; total?: unknown };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'routes'),
        inv.outputHasField(output, 'framework'),
        inv.outputHasField(output, 'total'),
        (() => {
            if (o.total !== 2) {
                return { ok: false, reason: `expected total=2, got ${String(o.total)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.framework !== 'express') {
                return {
                    ok: false,
                    reason: `expected framework='express', got ${String(o.framework)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.routes)) return { ok: false, reason: 'routes must be array' };
            const hasGet = o.routes.some(
                (r: unknown) => (r as { method?: unknown }).method === 'GET',
            );
            const hasPost = o.routes.some(
                (r: unknown) => (r as { method?: unknown }).method === 'POST',
            );
            if (!hasGet || !hasPost) {
                return {
                    ok: false,
                    reason: `expected GET and POST routes, got ${JSON.stringify(o.routes.map((r: unknown) => (r as { method?: unknown }).method))}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
