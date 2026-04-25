/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'diff'),
        (() => {
            const diff = (output as { diff: unknown }).diff;
            if (typeof diff !== 'string') {
                return { ok: false, reason: 'output.diff must be a string' };
            }
            if (diff.length === 0) {
                return {
                    ok: false,
                    reason: 'expected non-empty diff between version-a and version-b',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const diff = (output as { diff: unknown }).diff;
            if (typeof diff !== 'string') return { ok: true }; // already checked
            if (!diff.includes('---') || !diff.includes('+++')) {
                return {
                    ok: false,
                    reason: 'expected unified diff header lines (--- and +++) in output',
                };
            }
            return { ok: true };
        })(),
    ];
}
