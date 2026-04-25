/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'levels'),
        inv.outputHasField(output, 'totalReach'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['levels'])) {
                return { ok: false, reason: 'levels must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['totalReach'] !== 'number' || out['totalReach'] < 0) {
                return { ok: false, reason: 'totalReach must be a non-negative number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const levels = (out['levels'] as unknown[]) ?? [];
            const bad = levels.filter((l) => {
                const level = l as Record<string, unknown>;
                return typeof level['depth'] !== 'number' || !Array.isArray(level['files']);
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed level entries: ${bad.length} missing depth/files`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const levels = (out['levels'] as unknown[]) ?? [];
            // compiler.ts is imported by container.ts — expect at least one level
            if (levels.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one propagation level — container.ts imports compiler.ts',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
