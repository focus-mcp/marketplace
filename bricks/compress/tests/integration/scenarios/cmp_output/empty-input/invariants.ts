/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'compressed'),
        inv.outputHasField(output, 'originalLength'),
        inv.outputHasField(output, 'compressedLength'),
        inv.outputHasField(output, 'ratio'),
        (() => {
            const o = output as { compressed: unknown };
            if (typeof o.compressed !== 'string' || o.compressed !== '') {
                return {
                    ok: false,
                    reason: `expected compressed === "" for empty input, got ${JSON.stringify(o.compressed)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { originalLength: unknown };
            if (o.originalLength !== 0) {
                return {
                    ok: false,
                    reason: `expected originalLength === 0, got ${o.originalLength}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { ratio: unknown };
            if (o.ratio !== 1) {
                return {
                    ok: false,
                    reason: `expected ratio === 1 for empty input, got ${o.ratio}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
