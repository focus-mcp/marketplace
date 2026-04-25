/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'occurrences'),
        inv.outputHasField(output, 'fileCount'),
        inv.outputHasField(output, 'total'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['occurrences'])) {
                return { ok: false, reason: 'occurrences must be an array' };
            }
            if ((out['occurrences'] as unknown[]).length === 0) {
                return { ok: false, reason: 'expected non-empty occurrences for ModuleCompiler' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const total = out['total'];
            const fileCount = out['fileCount'];
            if (typeof total !== 'number' || total <= 0) {
                return {
                    ok: false,
                    reason: `total must be a positive number, got: ${String(total)}`,
                };
            }
            if (typeof fileCount !== 'number' || fileCount <= 0) {
                return {
                    ok: false,
                    reason: `fileCount must be a positive number, got: ${String(fileCount)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)['occurrences'] ?? [];
            const bad = items.filter((o) => {
                const entry = o as Record<string, unknown>;
                return (
                    typeof entry['file'] !== 'string' ||
                    typeof entry['line'] !== 'number' ||
                    typeof entry['context'] !== 'string'
                );
            });
            if (bad.length > 0) {
                return { ok: false, reason: `malformed occurrence entries: ${bad.length}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
