/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const langs = output as unknown[];
    return [
        inv.outputSizeUnder(1024)(output),
        (() => {
            if (!Array.isArray(langs) || langs.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty langs array, got ${JSON.stringify(langs)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(langs) || !langs.includes('typescript')) {
                return {
                    ok: false,
                    reason: `expected 'typescript' in langs, got ${JSON.stringify(langs)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(langs) || !langs.includes('javascript')) {
                return {
                    ok: false,
                    reason: `expected 'javascript' in langs, got ${JSON.stringify(langs)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(langs) || !langs.includes('yaml')) {
                return {
                    ok: false,
                    reason: `expected 'yaml' in langs, got ${JSON.stringify(langs)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
