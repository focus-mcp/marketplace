/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { imports?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'imports'),
        (() => {
            if (!Array.isArray(o.imports) || o.imports.length < 2) {
                return {
                    ok: false,
                    reason: `expected >= 2 imports, got ${String(o.imports?.length ?? 0)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.imports)) return { ok: false, reason: 'imports must be array' };
            const first = o.imports[0] as
                | { from?: unknown; kind?: unknown; names?: unknown }
                | undefined;
            if (!first || typeof first.from !== 'string' || first.kind !== 'esm') {
                return {
                    ok: false,
                    reason: `first import must have from:string and kind:esm, got ${JSON.stringify(first)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
