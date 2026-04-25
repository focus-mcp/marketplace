/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const FIELD = 'matches';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, FIELD),
        (() => {
            const items = (output as Record<string, unknown>)[FIELD];
            if (!Array.isArray(items)) {
                return { ok: false, reason: `${FIELD} must be array` };
            }
            // We expect at least one match for "interceptor" in NestJS packages
            if (items.length === 0) {
                return { ok: false, reason: `expected non-empty ${FIELD}` };
            }
            return { ok: true };
        })(),
        (() => {
            const items = (output as Record<string, string[]>)[FIELD] || [];
            const bad = items.filter((p) => !p.toLowerCase().includes('interceptor'));
            if (bad.length > 0) {
                return { ok: false, reason: `non-matching items: ${bad.slice(0, 3).join(', ')}` };
            }
            return { ok: true };
        })(),
    ];
}
