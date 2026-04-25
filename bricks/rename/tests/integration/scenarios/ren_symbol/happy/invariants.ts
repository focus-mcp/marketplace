/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'changes'),
        inv.outputHasField(output, 'totalFiles'),
        inv.outputHasField(output, 'totalChanges'),
        inv.outputHasField(output, 'applied'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['changes'])) {
                return { ok: false, reason: 'changes must be an array' };
            }
            if ((out['changes'] as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'expected non-empty changes — HelloService exists in hello-world fixture',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['applied'] !== true) {
                return { ok: false, reason: 'applied must be true when apply:true is passed' };
            }
            return { ok: true };
        })(),
        (() => {
            const changes = (output as Record<string, unknown[]>)['changes'] ?? [];
            const hasAfter = changes.every((c) => {
                const entry = c as Record<string, unknown>;
                return (
                    typeof entry['after'] === 'string' && entry['after'].includes('GreetService')
                );
            });
            if (!hasAfter) {
                return {
                    ok: false,
                    reason: 'all changes.after must contain "GreetService"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
