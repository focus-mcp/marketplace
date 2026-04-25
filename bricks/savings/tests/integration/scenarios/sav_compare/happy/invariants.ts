/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, sessionAId: string, sessionBId: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'better'),
        inv.outputHasField(output, 'improvement'),
        inv.outputHasField(output, 'details'),
        (() => {
            const o = output as { details: unknown };
            if (typeof o.details !== 'object' || o.details === null) {
                return { ok: false, reason: 'output.details must be an object' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { details: { a?: unknown; b?: unknown } };
            if (typeof o.details !== 'object' || o.details === null) return { ok: true };
            if (!('a' in o.details) || !('b' in o.details)) {
                return { ok: false, reason: 'output.details must have "a" and "b" fields' };
            }
            return { ok: true };
        })(),
        // Session A has 80% savings — must be the better one
        (() => {
            const o = output as { better: unknown };
            if (o.better !== sessionAId) {
                return {
                    ok: false,
                    reason: `expected better=sessionA (80%), got ${String(o.better)}`,
                };
            }
            return { ok: true };
        })(),
        // improvement ≈ 30 (80 - 50)
        (() => {
            const o = output as { improvement: unknown };
            if (typeof o.improvement !== 'number' || Math.abs(o.improvement - 30) > 0.1) {
                return {
                    ok: false,
                    reason: `expected improvement≈30, got ${String(o.improvement)}`,
                };
            }
            return { ok: true };
        })(),
        // details.a.id matches sessionAId
        (() => {
            const o = output as { details: { a: { id?: unknown }; b: { id?: unknown } } };
            if (typeof o.details !== 'object' || o.details === null) return { ok: true };
            if (o.details.a?.id !== sessionAId) {
                return {
                    ok: false,
                    reason: `expected details.a.id=${sessionAId}, got ${String(o.details.a?.id)}`,
                };
            }
            return { ok: true };
        })(),
        // details.b.id matches sessionBId
        (() => {
            const o = output as { details: { a: { id?: unknown }; b: { id?: unknown } } };
            if (typeof o.details !== 'object' || o.details === null) return { ok: true };
            if (o.details.b?.id !== sessionBId) {
                return {
                    ok: false,
                    reason: `expected details.b.id=${sessionBId}, got ${String(o.details.b?.id)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
