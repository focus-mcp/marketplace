/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'repos'),
        inv.outputSizeUnder(4096)(output),
        (() => {
            const o = output as { repos: unknown };
            if (!Array.isArray(o.repos)) {
                return {
                    ok: false,
                    reason: `expected repos to be an array, got ${typeof o.repos}`,
                };
            }
            if (o.repos.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected repos.length=${expectedCount}, got ${o.repos.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { repos: unknown[] };
            if (!Array.isArray(o.repos)) return { ok: true };
            for (const [i, repo] of o.repos.entries()) {
                const r = repo as Record<string, unknown>;
                if (typeof r['name'] !== 'string' || r['name'].length === 0) {
                    return {
                        ok: false,
                        reason: `repos[${i}].name must be a non-empty string`,
                    };
                }
                if (typeof r['path'] !== 'string' || r['path'].length === 0) {
                    return {
                        ok: false,
                        reason: `repos[${i}].path must be a non-empty string`,
                    };
                }
            }
            return { ok: true };
        })(),
    ];
}
