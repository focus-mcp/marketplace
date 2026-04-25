/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sessions'),
        (() => {
            const o = output as { sessions: unknown };
            if (!Array.isArray(o.sessions)) {
                return {
                    ok: false,
                    reason: `expected sessions to be an array, got ${typeof o.sessions}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { sessions: unknown[] };
            if (!Array.isArray(o.sessions)) return { ok: true };
            if (o.sessions.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected ${expectedCount} sessions, got ${o.sessions.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                sessions: Array<{ name: unknown; savedAt: unknown; fileCount: unknown }>;
            };
            if (!Array.isArray(o.sessions)) return { ok: true };
            for (const s of o.sessions) {
                if (typeof s.name !== 'string' || s.name.length === 0) {
                    return { ok: false, reason: `session entry missing non-empty name` };
                }
                if (typeof s.savedAt !== 'string' || s.savedAt.length === 0) {
                    return { ok: false, reason: `session entry missing non-empty savedAt` };
                }
                if (typeof s.fileCount !== 'number') {
                    return { ok: false, reason: `session entry fileCount is not a number` };
                }
            }
            return { ok: true };
        })(),
    ];
}
