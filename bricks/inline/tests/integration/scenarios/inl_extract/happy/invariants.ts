/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'extracted'),
        inv.outputHasField(output, 'functionSignature'),
        inv.outputHasField(output, 'params'),
        inv.outputHasField(output, 'preview'),
        (() => {
            const o = output as { extracted: unknown };
            if (o.extracted !== true) {
                return { ok: false, reason: `expected extracted === true, got ${o.extracted}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { functionSignature: unknown };
            if (typeof o.functionSignature !== 'string' || o.functionSignature.length === 0) {
                return { ok: false, reason: 'expected non-empty functionSignature string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { params: unknown };
            if (!Array.isArray(o.params)) {
                return { ok: false, reason: 'expected params to be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { preview: unknown };
            if (typeof o.preview !== 'string' || o.preview.length === 0) {
                return { ok: false, reason: 'expected non-empty preview string' };
            }
            return { ok: true };
        })(),
    ];
}
