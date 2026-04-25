/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const FIELD = 'references';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, FIELD),
        (() => {
            const items = (output as Record<string, unknown>)[FIELD];
            if (!Array.isArray(items)) {
                return { ok: false, reason: `${FIELD} must be array` };
            }
            if (items.length === 0) {
                return { ok: false, reason: `expected non-empty ${FIELD} for ModuleCompiler` };
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
                    typeof entry['snippet'] !== 'string' ||
                    (entry['kind'] !== 'import' && entry['kind'] !== 'usage')
                );
            });
            if (bad.length > 0) {
                return { ok: false, reason: `malformed reference entries: ${bad.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const hasCompilerRef = items.some((r) => {
                const entry = r as Record<string, unknown>;
                return (
                    typeof entry['snippet'] === 'string' &&
                    entry['snippet'].includes('ModuleCompiler')
                );
            });
            if (!hasCompilerRef) {
                return {
                    ok: false,
                    reason: 'expected at least one reference snippet containing "ModuleCompiler"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
