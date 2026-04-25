/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedChainId: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'chainId'),
        inv.outputHasField(output, 'branchIndex'),
        inv.outputHasField(output, 'label'),
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
            const o = output as { branchIndex: unknown };
            if (o.branchIndex !== 0) {
                return {
                    ok: false,
                    reason: `expected branchIndex=0 (first branch), got ${String(o.branchIndex)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { label: unknown };
            if (o.label !== 'alternative approach') {
                return {
                    ok: false,
                    reason: `expected label='alternative approach', got ${String(o.label)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
