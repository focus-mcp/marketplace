/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { valid?: unknown; error?: unknown; parsed?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'valid'),
        (() => {
            if (o.valid !== true) {
                return { ok: false, reason: `expected valid=true, got ${String(o.valid)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.error !== undefined) {
                return { ok: false, reason: `expected no error, got ${String(o.error)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.parsed === undefined || o.parsed === null) {
                return { ok: false, reason: `expected parsed to be defined` };
            }
            return { ok: true };
        })(),
    ];
}
