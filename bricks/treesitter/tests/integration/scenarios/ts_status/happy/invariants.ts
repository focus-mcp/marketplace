/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { files?: unknown; symbols?: unknown; langs?: unknown[] };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'symbols'),
        inv.outputHasField(output, 'langs'),
        (() => {
            if (o.files !== 1) {
                return { ok: false, reason: `expected files=1, got ${String(o.files)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.langs) || o.langs.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty langs array, got ${JSON.stringify(o.langs)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
