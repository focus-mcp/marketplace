/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'operations'),
        inv.outputHasField(output, 'filesAccessed'),
        inv.outputHasField(output, 'startedAt'),
        (() => {
            const o = output as { operations: unknown };
            if (typeof o.operations !== 'number') {
                return {
                    ok: false,
                    reason: `expected operations to be a number, got ${typeof o.operations}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { filesAccessed: unknown };
            if (!Array.isArray(o.filesAccessed)) {
                return {
                    ok: false,
                    reason: `expected filesAccessed to be an array, got ${typeof o.filesAccessed}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { startedAt: unknown };
            if (typeof o.startedAt !== 'string' || o.startedAt.length === 0) {
                return {
                    ok: false,
                    reason: `expected startedAt to be a non-empty string, got ${String(o.startedAt)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
