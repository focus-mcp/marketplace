/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'directDependents'),
        inv.outputHasField(output, 'indirectDependents'),
        inv.outputHasField(output, 'totalAffected'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['directDependents'])) {
                return { ok: false, reason: 'directDependents must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['indirectDependents'])) {
                return { ok: false, reason: 'indirectDependents must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['totalAffected'] !== 'number' || out['totalAffected'] < 0) {
                return { ok: false, reason: 'totalAffected must be a non-negative number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const direct = (out['directDependents'] as unknown[]) ?? [];
            const bad = direct.filter((d) => {
                const entry = d as Record<string, unknown>;
                return typeof entry['file'] !== 'string' || !Array.isArray(entry['imports']);
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed directDependent entries: ${bad.length} missing file/imports`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const indirect = (out['indirectDependents'] as unknown[]) ?? [];
            const bad = indirect.filter((d) => {
                const entry = d as Record<string, unknown>;
                return typeof entry['file'] !== 'string' || typeof entry['depth'] !== 'number';
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed indirectDependent entries: ${bad.length} missing file/depth`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const direct = (out['directDependents'] as unknown[]) ?? [];
            // compiler.ts is imported by container.ts — expect at least one direct dependent
            if (direct.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one directDependent — container.ts imports compiler.ts',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const direct = (out['directDependents'] as unknown[]) ?? [];
            const hasContainer = direct.some((d) => {
                const entry = d as Record<string, unknown>;
                return typeof entry['file'] === 'string' && entry['file'].includes('container');
            });
            if (!hasContainer) {
                return {
                    ok: false,
                    reason: 'expected container.ts in directDependents — it directly imports compiler.ts',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const direct = (out['directDependents'] as unknown[]) ?? [];
            const indirect = (out['indirectDependents'] as unknown[]) ?? [];
            const totalAffected = out['totalAffected'];
            if (
                typeof totalAffected === 'number' &&
                totalAffected !== direct.length + indirect.length
            ) {
                return {
                    ok: false,
                    reason: `totalAffected (${totalAffected}) must equal directDependents.length (${direct.length}) + indirectDependents.length (${indirect.length})`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
