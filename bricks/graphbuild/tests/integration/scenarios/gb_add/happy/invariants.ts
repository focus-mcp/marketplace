/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedId: string): InvariantResult[] {
    const o = output as { added?: unknown; id?: unknown };
    return [
        inv.outputHasField(output, 'added'),
        inv.outputHasField(output, 'id'),
        (() => {
            if (o.added !== 'node') {
                return {
                    ok: false,
                    reason: `expected added='node', got ${String(o.added)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.id !== expectedId) {
                return {
                    ok: false,
                    reason: `expected id='${expectedId}', got ${String(o.id)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(1024)(output),
    ];
}
