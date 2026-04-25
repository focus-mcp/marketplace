/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'content'),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['content'] !== 'string' || out['content'].length === 0) {
                return { ok: false, reason: 'content must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['content'] !== 'string') return { ok: true };
            if (!out['content'].includes('ModuleCompiler')) {
                return {
                    ok: false,
                    reason: 'content must include "ModuleCompiler" — compiler.ts defines this class',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
