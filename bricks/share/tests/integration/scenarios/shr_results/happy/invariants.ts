/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function checkStore(output: unknown): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'taskId'),
        inv.outputHasField(output, 'result'),
        inv.outputHasField(output, 'stored'),
        (() => {
            const o = output as { stored: unknown };
            if (o.stored !== true) {
                return {
                    ok: false,
                    reason: `expected stored=true on write, got ${String(o.stored)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}

export function checkRead(output: unknown, expectedResult: unknown): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'taskId'),
        inv.outputHasField(output, 'result'),
        inv.outputHasField(output, 'stored'),
        (() => {
            const o = output as { stored: unknown };
            if (o.stored !== false) {
                return {
                    ok: false,
                    reason: `expected stored=false on read, got ${String(o.stored)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { result: unknown };
            if (JSON.stringify(o.result) !== JSON.stringify(expectedResult)) {
                return {
                    ok: false,
                    reason: `expected result=${JSON.stringify(expectedResult)}, got ${JSON.stringify(o.result)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
