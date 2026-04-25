/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, originalJsonLength: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'compressed'),
        inv.outputHasField(output, 'ratio'),
        (() => {
            const o = output as { compressed: unknown };
            if (typeof o.compressed !== 'string') {
                return { ok: false, reason: 'compressed must be a string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { compressed: string };
            // Must be valid JSON
            try {
                JSON.parse(o.compressed);
            } catch {
                return { ok: false, reason: 'compressed must be valid JSON' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { compressed: string };
            if (o.compressed.length >= originalJsonLength) {
                return {
                    ok: false,
                    reason: `expected compressed length (${o.compressed.length}) < original (${originalJsonLength})`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { compressed: string };
            // Nulls should be stripped
            const parsed = JSON.parse(o.compressed) as Record<string, unknown>;
            const hasNulls = JSON.stringify(parsed).includes(':null');
            if (hasNulls) {
                return { ok: false, reason: 'compressed JSON should not contain null values' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { ratio: unknown };
            if (typeof o.ratio !== 'number' || o.ratio <= 0) {
                return { ok: false, reason: `ratio must be a positive number, got ${o.ratio}` };
            }
            return { ok: true };
        })(),
    ];
}
