/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const FIELD = 'symbols';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, FIELD),
        (() => {
            const items = (output as Record<string, unknown>)[FIELD];
            if (!Array.isArray(items)) {
                return { ok: false, reason: `${FIELD} must be array` };
            }
            if (items.length === 0) {
                return { ok: false, reason: `expected non-empty ${FIELD}` };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const hasModule = items.some(
                (s) => (s as Record<string, unknown>)['name'] === 'Module',
            );
            if (!hasModule) {
                return { ok: false, reason: 'expected at least one symbol named exactly "Module"' };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const bad = items.filter((s) => {
                const name = (s as Record<string, unknown>)['name'];
                return typeof name !== 'string' || !name.includes('Module');
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `non-matching items: ${bad
                        .slice(0, 3)
                        .map((s) => String((s as Record<string, unknown>)['name']))
                        .join(', ')}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, unknown[]>)[FIELD] ?? [];
            const validKinds = new Set([
                'function',
                'class',
                'interface',
                'type',
                'variable',
                'method',
            ]);
            const badKind = items.find(
                (s) => !validKinds.has(String((s as Record<string, unknown>)['kind'])),
            );
            if (badKind) {
                return {
                    ok: false,
                    reason: `unexpected kind: ${String((badKind as Record<string, unknown>)['kind'])}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
