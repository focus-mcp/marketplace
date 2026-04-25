/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'packed'),
        inv.outputHasField(output, 'fileCount'),
        inv.outputHasField(output, 'totalTokens'),
        (() => {
            const out = output as { packed: unknown; fileCount: unknown; totalTokens: unknown };
            if (typeof out.packed !== 'string') {
                return { ok: false, reason: 'output.packed must be a string' };
            }
            if (out.packed.length === 0) {
                return { ok: false, reason: 'output.packed must not be empty' };
            }
            if (typeof out.fileCount !== 'number' || out.fileCount !== 3) {
                return {
                    ok: false,
                    reason: `expected fileCount=3, got ${String(out.fileCount)}`,
                };
            }
            if (typeof out.totalTokens !== 'number' || out.totalTokens <= 0) {
                return { ok: false, reason: 'output.totalTokens must be > 0' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(65536)(output),
    ];
}
