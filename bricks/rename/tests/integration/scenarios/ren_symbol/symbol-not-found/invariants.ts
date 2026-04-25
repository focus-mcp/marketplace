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
            const changes = out['changes'];
            if (!Array.isArray(changes) || changes.length !== 0) {
                return {
                    ok: false,
                    reason: `changes must be empty array for unknown symbol, got: ${Array.isArray(changes) ? changes.length : 'non-array'}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['totalChanges'] !== 0) {
                return {
                    ok: false,
                    reason: `totalChanges must be 0 for unknown symbol, got: ${String(out['totalChanges'])}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['applied'] !== false) {
                return { ok: false, reason: 'applied must be false when apply:false is passed' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
