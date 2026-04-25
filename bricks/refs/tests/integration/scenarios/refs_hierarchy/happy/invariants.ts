/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'parents'),
        inv.outputHasField(output, 'children'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['parents'])) {
                return { ok: false, reason: 'parents must be an array' };
            }
            if (!Array.isArray(out['children'])) {
                return { ok: false, reason: 'children must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const parents = (output as Record<string, unknown[]>)['parents'] ?? [];
            if (parents.length === 0) {
                return {
                    ok: false,
                    reason: 'ModuleRef extends AbstractInstanceResolver — parents must be non-empty',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const parents = (output as Record<string, unknown[]>)['parents'] ?? [];
            const hasAbstract = parents.some((p) => String(p) === 'AbstractInstanceResolver');
            if (!hasAbstract) {
                return {
                    ok: false,
                    reason: `expected "AbstractInstanceResolver" in parents, got: ${parents.join(', ')}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
