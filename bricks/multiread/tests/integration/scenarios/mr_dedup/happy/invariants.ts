/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sharedImports'),
        inv.outputHasField(output, 'files'),
        (() => {
            const out = output as { sharedImports: unknown };
            if (!Array.isArray(out.sharedImports)) {
                return { ok: false, reason: 'output.sharedImports must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { files: unknown };
            if (typeof out.files !== 'object' || out.files === null) {
                return { ok: false, reason: 'output.files must be an object' };
            }
            const keys = Object.keys(out.files as Record<string, unknown>);
            if (keys.length < 2) {
                return { ok: false, reason: `expected 2 file entries, got ${keys.length}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(131072)(output),
    ];
}
