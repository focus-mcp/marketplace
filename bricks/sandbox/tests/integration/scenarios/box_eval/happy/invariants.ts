/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { value?: unknown; type?: unknown; error?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'type'),
        (() => {
            if (o.error !== undefined) {
                return { ok: false, reason: `expected no error, got ${String(o.error)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.value !== '4') {
                return { ok: false, reason: `expected value='4', got ${String(o.value)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.type !== 'number') {
                return { ok: false, reason: `expected type='number', got ${String(o.type)}` };
            }
            return { ok: true };
        })(),
    ];
}
