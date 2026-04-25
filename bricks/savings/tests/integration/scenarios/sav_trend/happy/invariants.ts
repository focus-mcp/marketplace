/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, sessionCount: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sessions'),
        inv.outputHasField(output, 'avgSavingsPercent'),
        inv.outputHasField(output, 'trend'),
        (() => {
            const o = output as { sessions: unknown };
            if (!Array.isArray(o.sessions)) {
                return { ok: false, reason: 'output.sessions must be an array' };
            }
            return { ok: true };
        })(),
        // sessions count matches the requested last parameter
        (() => {
            const o = output as { sessions: unknown[] };
            if (!Array.isArray(o.sessions)) return { ok: true };
            if (o.sessions.length !== sessionCount) {
                return {
                    ok: false,
                    reason: `expected ${sessionCount} sessions, got ${o.sessions.length}`,
                };
            }
            return { ok: true };
        })(),
        // Each session has id, timestamp, saved, percentage fields
        (() => {
            const o = output as { sessions: unknown[] };
            if (!Array.isArray(o.sessions) || o.sessions.length === 0) return { ok: true };
            const first = o.sessions[0] as Record<string, unknown>;
            for (const field of ['id', 'timestamp', 'saved', 'percentage']) {
                if (!(field in first)) {
                    return {
                        ok: false,
                        reason: `session item missing field "${field}"`,
                    };
                }
            }
            return { ok: true };
        })(),
        // avgSavingsPercent is a number
        (() => {
            const o = output as { avgSavingsPercent: unknown };
            if (typeof o.avgSavingsPercent !== 'number') {
                return {
                    ok: false,
                    reason: `expected avgSavingsPercent to be a number, got ${typeof o.avgSavingsPercent}`,
                };
            }
            return { ok: true };
        })(),
        // trend is one of the valid values
        (() => {
            const o = output as { trend: unknown };
            const valid = new Set(['improving', 'stable', 'declining']);
            if (typeof o.trend !== 'string' || !valid.has(o.trend)) {
                return {
                    ok: false,
                    reason: `expected trend in {improving, stable, declining}, got ${String(o.trend)}`,
                };
            }
            return { ok: true };
        })(),
        // trend direction must be "improving" for 10%→40%→80% data
        (() => {
            const o = output as { trend: unknown };
            if (o.trend !== 'improving') {
                return {
                    ok: false,
                    reason: `expected trend="improving" for 10%→40%→80% data, got "${String(o.trend)}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
