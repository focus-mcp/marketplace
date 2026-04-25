/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'project'),
        inv.outputHasField(output, 'keyFiles'),
        inv.outputHasField(output, 'summary'),
        inv.outputSizeUnder(4096)(output),
        (() => {
            const o = output as { keyFiles: unknown };
            if (!Array.isArray(o.keyFiles)) {
                return { ok: false, reason: 'expected keyFiles to be an array' };
            }
            if (o.keyFiles.length !== 0) {
                return {
                    ok: false,
                    reason: `expected keyFiles=[] for empty dir, got ${String(o.keyFiles.length)} entries`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { summary: unknown };
            if (typeof o.summary !== 'string' || o.summary.length === 0) {
                return {
                    ok: false,
                    reason: 'expected summary to be a non-empty string even for empty dir',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { project: unknown };
            if (typeof o.project !== 'object' || o.project === null) {
                return { ok: false, reason: 'expected project to be an object' };
            }
            const p = o.project as Record<string, unknown>;
            const lang = p['language'];
            if (typeof lang !== 'string') {
                return { ok: false, reason: 'expected project.language to be a string' };
            }
            return { ok: true };
        })(),
    ];
}
