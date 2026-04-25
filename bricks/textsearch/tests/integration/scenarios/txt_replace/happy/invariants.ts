/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'changes'),
        inv.outputHasField(output, 'filesAffected'),
        inv.outputHasField(output, 'totalReplacements'),
        inv.outputHasField(output, 'applied'),
        (() => {
            const out = output as { totalReplacements: unknown };
            if (typeof out.totalReplacements !== 'number' || out.totalReplacements < 1) {
                return { ok: false, reason: 'expected at least 1 replacement' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { applied: unknown };
            if (out.applied !== true) {
                return { ok: false, reason: 'expected applied=true when apply flag is set' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
