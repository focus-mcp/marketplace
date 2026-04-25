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
        inv.outputLengthLessThan('compressed', originalJsonLength)(output),
        (() => {
            const o = output as { compressed: string };
            // Nulls should be stripped — use structural walk to avoid false positives on strings like "status:null"
            let parsed: unknown;
            try {
                parsed = JSON.parse(o.compressed);
            } catch {
                return { ok: true }; // already reported invalid JSON above
            }
            function hasNullValue(value: unknown): boolean {
                if (value === null) return true;
                if (Array.isArray(value)) return value.some(hasNullValue);
                if (typeof value !== 'object') return false;
                return Object.values(value as Record<string, unknown>).some(hasNullValue);
            }
            if (hasNullValue(parsed)) {
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
