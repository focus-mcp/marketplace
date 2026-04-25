/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function checkWrite(output: unknown, expectedValue: unknown): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'key'),
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'set'),
        (() => {
            const o = output as { set: unknown };
            if (o.set !== true) {
                return { ok: false, reason: `expected set=true on write, got ${String(o.set)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { value: unknown };
            if (JSON.stringify(o.value) !== JSON.stringify(expectedValue)) {
                return {
                    ok: false,
                    reason: `expected value=${JSON.stringify(expectedValue)}, got ${JSON.stringify(o.value)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}

export function checkRead(output: unknown, expectedValue: unknown): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'key'),
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'set'),
        (() => {
            const o = output as { set: unknown };
            if (o.set !== false) {
                return { ok: false, reason: `expected set=false on read, got ${String(o.set)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { value: unknown };
            if (JSON.stringify(o.value) !== JSON.stringify(expectedValue)) {
                return {
                    ok: false,
                    reason: `expected value=${JSON.stringify(expectedValue)}, got ${JSON.stringify(o.value)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
