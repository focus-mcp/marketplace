/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'affected'),
        inv.outputHasField(output, 'count'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['affected'])) {
                return { ok: false, reason: 'affected must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['count'] !== 'number' || out['count'] < 0) {
                return { ok: false, reason: 'count must be a non-negative number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const affected = out['affected'] as unknown[];
            if (Array.isArray(affected) && typeof out['count'] === 'number') {
                if (affected.length !== out['count']) {
                    return {
                        ok: false,
                        reason: `count (${out['count']}) must equal affected.length (${affected.length})`,
                    };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const affected = (out['affected'] as unknown[]) ?? [];
            const bad = affected.filter((a) => {
                const entry = a as Record<string, unknown>;
                return (
                    typeof entry['file'] !== 'string' ||
                    typeof entry['reason'] !== 'string' ||
                    typeof entry['depth'] !== 'number'
                );
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed affected entries: ${bad.length} missing file/reason/depth`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const affected = (out['affected'] as unknown[]) ?? [];
            // compiler.ts is imported by container.ts — expect at least one affected file
            if (affected.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one affected file — container.ts imports compiler.ts',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const affected = (out['affected'] as unknown[]) ?? [];
            const hasContainer = affected.some((a) => {
                const entry = a as Record<string, unknown>;
                return typeof entry['file'] === 'string' && entry['file'].includes('container');
            });
            if (!hasContainer) {
                return {
                    ok: false,
                    reason: 'expected container.ts in affected list — it directly imports compiler.ts',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
