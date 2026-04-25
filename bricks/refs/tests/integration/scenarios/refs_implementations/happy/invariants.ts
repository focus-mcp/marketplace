/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const FIELD = 'implementations';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, FIELD),
        (() => {
            const items = (output as Record<string, unknown>)[FIELD];
            if (!Array.isArray(items)) {
                return { ok: false, reason: `${FIELD} must be array` };
            }
            if (items.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty ${FIELD} for ModuleOpaqueKeyFactory`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const bad = items.filter((r) => {
                const entry = r as Record<string, unknown>;
                return (
                    typeof entry['file'] !== 'string' ||
                    typeof entry['line'] !== 'number' ||
                    typeof entry['snippet'] !== 'string'
                );
            });
            if (bad.length > 0) {
                return { ok: false, reason: `malformed implementation entries: ${bad.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const allImplement = items.every((r) => {
                const snippet = String((r as Record<string, unknown>)['snippet']);
                return snippet.includes('implements') || snippet.includes('extends');
            });
            if (!allImplement) {
                return {
                    ok: false,
                    reason: 'expected all implementation snippets to contain "implements" or "extends"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
