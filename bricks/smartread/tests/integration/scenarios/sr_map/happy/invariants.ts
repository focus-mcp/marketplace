/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'lines'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['lines'])) {
                return { ok: false, reason: 'lines must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const lines = out['lines'];
            if (!Array.isArray(lines) || lines.length === 0) {
                return {
                    ok: false,
                    reason: 'lines must be non-empty — compiler.ts has class/interface declarations',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const lines = (out['lines'] as unknown[]) ?? [];
            const hasClass = lines.some(
                (l) => typeof l === 'string' && l.includes('ModuleCompiler'),
            );
            if (!hasClass) {
                return {
                    ok: false,
                    reason: 'expected at least one line mentioning "ModuleCompiler"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
