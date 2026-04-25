/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { languages?: unknown };
    const results: InvariantResult[] = [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'languages'),
        (() => {
            if (!Array.isArray(o.languages) || o.languages.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty languages array, got ${String(o.languages)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.languages)) {
        const langs = o.languages as Array<{ name?: unknown; supported?: unknown }>;

        const js = langs.find((l) => l.name === 'javascript');
        results.push(
            (() => {
                if (!js) return { ok: false, reason: 'expected javascript entry in languages' };
                if (js.supported !== true) {
                    return {
                        ok: false,
                        reason: `expected javascript.supported=true, got ${String(js.supported)}`,
                    };
                }
                return { ok: true };
            })(),
        );

        const ts = langs.find((l) => l.name === 'typescript');
        results.push(
            (() => {
                if (!ts) return { ok: false, reason: 'expected typescript entry in languages' };
                if (ts.supported !== true) {
                    return {
                        ok: false,
                        reason: `expected typescript.supported=true, got ${String(ts.supported)}`,
                    };
                }
                return { ok: true };
            })(),
        );
    }

    return results;
}
