/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedValue: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'tags'),
        inv.outputHasField(output, 'storedAt'),
        (() => {
            const o = output as { value: unknown };
            if (o.value !== expectedValue) {
                return {
                    ok: false,
                    reason: `expected value='${expectedValue}', got ${String(o.value)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { tags: unknown };
            if (!Array.isArray(o.tags)) {
                return {
                    ok: false,
                    reason: `expected tags to be an array, got ${typeof o.tags}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { storedAt: unknown };
            if (typeof o.storedAt !== 'string' || o.storedAt.length === 0) {
                return {
                    ok: false,
                    reason: `expected storedAt to be a non-empty string, got ${String(o.storedAt)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
