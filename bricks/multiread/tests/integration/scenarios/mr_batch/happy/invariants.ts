/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        (() => {
            const out = output as { files: unknown };
            if (typeof out.files !== 'object' || out.files === null) {
                return { ok: false, reason: 'output.files must be an object' };
            }
            const keys = Object.keys(out.files as Record<string, unknown>);
            if (keys.length < 3) {
                return { ok: false, reason: `expected 3 file entries, got ${keys.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { files: Record<string, unknown> };
            if (typeof out.files !== 'object' || out.files === null) return { ok: true };
            for (const [key, val] of Object.entries(out.files)) {
                if (typeof val !== 'string' || val.length === 0) {
                    return { ok: false, reason: `file "${key}" has empty or non-string content` };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(131072)(output),
    ];
}
