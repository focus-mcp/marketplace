/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function validateSourceEntry(s: Record<string, unknown>, i: number): InvariantResult {
    const fields: Array<[string, (v: unknown) => boolean]> = [
        ['path', (v) => typeof v === 'string'],
        ['exports', (v) => Array.isArray(v)],
        ['imports', (v) => Array.isArray(v)],
        ['types', (v) => Array.isArray(v)],
        ['functions', (v) => Array.isArray(v)],
    ];
    for (const [field, validate] of fields) {
        if (!validate(s[field])) {
            return { ok: false, reason: `sources[${i}].${field} invalid` };
        }
    }
    return { ok: true };
}

export function check(output: unknown, expectedPaths: string[]): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sources'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as { sources: unknown };
            if (!Array.isArray(o.sources)) {
                return {
                    ok: false,
                    reason: `expected sources to be an array, got ${typeof o.sources}`,
                };
            }
            if (o.sources.length !== expectedPaths.length) {
                return {
                    ok: false,
                    reason: `expected sources.length=${expectedPaths.length}, got ${o.sources.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { sources: unknown[] };
            if (!Array.isArray(o.sources)) return { ok: true };
            for (const [i, src] of o.sources.entries()) {
                const result = validateSourceEntry(src as Record<string, unknown>, i);
                if (!result.ok) return result;
            }
            return { ok: true };
        })(),
    ];
}
