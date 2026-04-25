/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'pid'),
        inv.outputHasField(output, 'command'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { id: unknown };
            if (typeof o.id !== 'string' || o.id.length === 0) {
                return { ok: false, reason: 'expected id to be a non-empty string (uuid)' };
            }
            // UUID format check
            if (!/^[0-9a-f-]{36}$/i.test(o.id)) {
                return {
                    ok: false,
                    reason: `expected id to be a UUID, got "${o.id}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { pid: unknown };
            if (typeof o.pid !== 'number' || o.pid <= 0) {
                return {
                    ok: false,
                    reason: `expected pid to be a positive number, got ${String(o.pid)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { command: unknown };
            if (o.command !== 'sleep 60') {
                return {
                    ok: false,
                    reason: `expected command="sleep 60", got "${String(o.command)}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
