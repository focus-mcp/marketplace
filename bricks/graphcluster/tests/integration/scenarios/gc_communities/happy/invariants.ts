/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { communities?: unknown };
    return [
        inv.outputHasField(output, 'communities'),
        (() => {
            if (!Array.isArray(o.communities) || o.communities.length === 0) {
                return {
                    ok: false,
                    reason: `expected communities to be a non-empty array, got ${JSON.stringify(o.communities)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const communities = o.communities as unknown[];
            for (const c of communities) {
                const entry = c as {
                    id?: unknown;
                    members?: unknown;
                    size?: unknown;
                    density?: unknown;
                };
                if (typeof entry.id !== 'number') {
                    return { ok: false, reason: `community.id must be a number` };
                }
                if (!Array.isArray(entry.members)) {
                    return { ok: false, reason: `community.members must be an array` };
                }
                if (typeof entry.size !== 'number' || entry.size < 2) {
                    return {
                        ok: false,
                        reason: `community.size must be >= 2 (minSize=2), got ${String(entry.size)}`,
                    };
                }
                if (typeof entry.density !== 'number') {
                    return { ok: false, reason: `community.density must be a number` };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
