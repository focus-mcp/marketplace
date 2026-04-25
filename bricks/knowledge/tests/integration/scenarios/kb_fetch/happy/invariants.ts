/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedId: string,
    expectedTitle: string,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'title'),
        inv.outputHasField(output, 'content'),
        inv.outputHasField(output, 'tags'),
        inv.outputHasField(output, 'createdAt'),
        (() => {
            const o = output as { id: unknown };
            if (o.id !== expectedId) {
                return {
                    ok: false,
                    reason: `expected id='${expectedId}', got ${String(o.id)}`,
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
            const o = output as { createdAt: unknown };
            if (typeof o.createdAt !== 'number') {
                return {
                    ok: false,
                    reason: `expected createdAt to be a number, got ${typeof o.createdAt}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
