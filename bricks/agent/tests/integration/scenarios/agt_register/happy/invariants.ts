/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { id?: unknown; name?: unknown; capabilities?: unknown };
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'name'),
        inv.outputHasField(output, 'capabilities'),
        (() => {
            if (typeof o.id !== 'string' || o.id.length === 0) {
                return {
                    ok: false,
                    reason: `expected id to be a non-empty string, got ${String(o.id)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.name !== 'test-agent-alpha') {
                return {
                    ok: false,
                    reason: `expected name='test-agent-alpha', got ${String(o.name)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.capabilities) || o.capabilities.length !== 3) {
                return {
                    ok: false,
                    reason: `expected capabilities to be array of 3, got ${JSON.stringify(o.capabilities)}`,
                };
            }
            const caps = o.capabilities as unknown[];
            for (const cap of caps) {
                if (typeof cap !== 'string') {
                    return {
                        ok: false,
                        reason: `expected each capability to be a string, got ${String(cap)}`,
                    };
                }
            }
            return { ok: true };
        })(),
    ];
}
