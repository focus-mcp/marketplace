/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedMessage: string): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'delivered'),
        inv.outputHasField(output, 'message'),
        inv.outputHasField(output, 'timestamp'),
        (() => {
            const o = output as { delivered: unknown };
            if (typeof o.delivered !== 'number') {
                return {
                    ok: false,
                    reason: `expected delivered to be a number, got ${typeof o.delivered}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { message: unknown };
            if (o.message !== expectedMessage) {
                return {
                    ok: false,
                    reason: `expected message='${expectedMessage}', got ${String(o.message)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { timestamp: unknown };
            if (typeof o.timestamp !== 'string' || o.timestamp.length === 0) {
                return {
                    ok: false,
                    reason: `expected timestamp to be a non-empty string, got ${String(o.timestamp)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
