/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedTitle: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'title'),
        inv.outputHasField(output, 'tokenCount'),
        (() => {
            const o = output as { id: unknown };
            if (typeof o.id !== 'string' || o.id.length === 0) {
                return {
                    ok: false,
                    reason: `expected id to be a non-empty string, got ${String(o.id)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { title: unknown };
            if (o.title !== expectedTitle) {
                return {
                    ok: false,
                    reason: `expected title='${expectedTitle}', got ${String(o.title)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { tokenCount: unknown };
            if (typeof o.tokenCount !== 'number' || o.tokenCount <= 0) {
                return {
                    ok: false,
                    reason: `expected tokenCount to be a positive number, got ${String(o.tokenCount)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
