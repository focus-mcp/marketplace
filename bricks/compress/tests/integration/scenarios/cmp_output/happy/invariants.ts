/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, originalLength: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'compressed'),
        inv.outputHasField(output, 'originalLength'),
        inv.outputHasField(output, 'compressedLength'),
        inv.outputHasField(output, 'ratio'),
        (() => {
            const o = output as { compressed: unknown };
            if (typeof o.compressed !== 'string') {
                return { ok: false, reason: 'compressed must be a string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { compressedLength: unknown; originalLength: unknown };
            if (typeof o.compressedLength !== 'number' || typeof o.originalLength !== 'number') {
                return { ok: false, reason: 'compressedLength and originalLength must be numbers' };
            }
            if (o.compressedLength >= o.originalLength) {
                return {
                    ok: false,
                    reason: `expected compressedLength (${o.compressedLength}) < originalLength (${o.originalLength})`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { ratio: unknown };
            if (typeof o.ratio !== 'number' || o.ratio <= 0 || o.ratio >= 1) {
                return {
                    ok: false,
                    reason: `expected ratio in (0,1) for non-trivial compression, got ${o.ratio}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputLengthLessThan('compressed', originalLength)(output),
    ];
}
