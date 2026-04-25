/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'tags'),
        (() => {
            const o = output as { value: unknown };
            if (o.value !== null) {
                return {
                    ok: false,
                    reason: `expected value=null for non-existent key, got ${String(o.value)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { tags: unknown };
            if (!Array.isArray(o.tags) || o.tags.length !== 0) {
                return {
                    ok: false,
                    reason: `expected tags=[] for non-existent key, got ${JSON.stringify(o.tags)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as Record<string, unknown>;
            if (!('storedAt' in o)) {
                return {
                    ok: false,
                    reason: 'expected storedAt field in non-existent recall response',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { storedAt: unknown };
            if (o.storedAt !== '') {
                return {
                    ok: false,
                    reason: `expected storedAt to be empty string, got '${String(o.storedAt)}'`,
                };
            }
            return { ok: true };
        })(),
    ];
}
