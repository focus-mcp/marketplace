/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'debateId'),
        inv.outputHasField(output, 'topic'),
        inv.outputHasField(output, 'positionCount'),
        (() => {
            const o = output as { debateId: unknown };
            if (typeof o.debateId !== 'string' || o.debateId.length === 0) {
                return {
                    ok: false,
                    reason: `expected debateId to be a non-empty string, got ${String(o.debateId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { topic: unknown };
            if (o.topic !== 'Should we adopt microservices?') {
                return {
                    ok: false,
                    reason: `expected topic='Should we adopt microservices?', got ${String(o.topic)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { positionCount: unknown };
            if (o.positionCount !== 2) {
                return {
                    ok: false,
                    reason: `expected positionCount=2, got ${String(o.positionCount)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
