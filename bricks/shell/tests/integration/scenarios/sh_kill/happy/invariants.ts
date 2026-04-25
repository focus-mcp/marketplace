/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedId: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'killed'),
        inv.outputHasField(output, 'id'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { killed: unknown };
            if (o.killed !== true) {
                return {
                    ok: false,
                    reason: `expected killed=true, got ${String(o.killed)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { id: unknown };
            if (o.id !== expectedId) {
                return {
                    ok: false,
                    reason: `expected id="${expectedId}", got "${String(o.id)}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
