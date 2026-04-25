/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'indent'),
        inv.outputHasField(output, 'quotes'),
        inv.outputHasField(output, 'semicolons'),
        inv.outputHasField(output, 'importStyle'),
        inv.outputHasField(output, 'lineEnding'),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['indent'] !== 'string' || out['indent'].length === 0) {
                return { ok: false, reason: 'indent must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const validQuotes = new Set(['single', 'double']);
            if (!validQuotes.has(String(out['quotes']))) {
                return {
                    ok: false,
                    reason: `quotes must be "single" or "double", got: ${String(out['quotes'])}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['semicolons'] !== 'boolean') {
                return { ok: false, reason: 'semicolons must be a boolean' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const validEndings = new Set(['lf', 'crlf']);
            if (!validEndings.has(String(out['lineEnding']))) {
                return {
                    ok: false,
                    reason: `lineEnding must be "lf" or "crlf", got: ${String(out['lineEnding'])}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
