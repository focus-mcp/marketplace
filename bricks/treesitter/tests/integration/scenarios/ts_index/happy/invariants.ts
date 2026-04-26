/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { files?: unknown; symbols?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'symbols'),
        (() => {
            if (o.files !== 1) {
                return { ok: false, reason: `expected files=1, got ${String(o.files)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.symbols !== 'number' || o.symbols < 2) {
                return { ok: false, reason: `expected symbols >= 2, got ${String(o.symbols)}` };
            }
            return { ok: true };
        })(),
    ];
}
