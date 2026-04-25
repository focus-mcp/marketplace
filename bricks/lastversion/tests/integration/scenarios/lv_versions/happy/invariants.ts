/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'versions'),
        inv.outputHasField(output, 'total'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as { versions: unknown };
            if (!Array.isArray(o.versions)) {
                return { ok: false, reason: 'expected versions to be an array' };
            }
            if (o.versions.length === 0) {
                return { ok: false, reason: 'expected at least one version entry for lodash' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { total: unknown };
            if (typeof o.total !== 'number' || o.total <= 0) {
                return {
                    ok: false,
                    reason: `expected total > 0, got ${String(o.total)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { versions: Array<unknown> };
            if (o.versions.length === 0) return { ok: true };
            const first = o.versions[0] as Record<string, unknown>;
            if (typeof first['version'] !== 'string' || first['version'].length === 0) {
                return {
                    ok: false,
                    reason: 'expected each version entry to have a version string',
                };
            }
            return { ok: true };
        })(),
    ];
}
