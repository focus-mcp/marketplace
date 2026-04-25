/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedChainId: string,
    expectedOriginal: string,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'chainId'),
        inv.outputHasField(output, 'stepIndex'),
        inv.outputHasField(output, 'original'),
        inv.outputHasField(output, 'revised'),
        (() => {
            const o = output as { chainId: unknown };
            if (o.chainId !== expectedChainId) {
                return {
                    ok: false,
                    reason: `expected chainId='${expectedChainId}', got ${String(o.chainId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { stepIndex: unknown };
            if (o.stepIndex !== 0) {
                return {
                    ok: false,
                    reason: `expected stepIndex=0, got ${String(o.stepIndex)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { original: unknown };
            if (o.original !== expectedOriginal) {
                return {
                    ok: false,
                    reason: `expected original='${expectedOriginal}', got ${String(o.original)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { revised: unknown };
            if (o.revised !== 'A systematic approach with clear phases') {
                return {
                    ok: false,
                    reason: `expected revised='A systematic approach with clear phases', got ${String(o.revised)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
