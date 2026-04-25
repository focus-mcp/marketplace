/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'table'),
        inv.outputHasField(output, 'width'),
        (() => {
            const out = output as { table: unknown };
            if (typeof out.table !== 'string') {
                return { ok: false, reason: 'output.table must be a string' };
            }
            if (!out.table.includes('+')) {
                return {
                    ok: false,
                    reason: `expected "+--+" border characters in ASCII table`,
                };
            }
            if (!out.table.includes('Name')) {
                return { ok: false, reason: 'expected "Name" header in ASCII table' };
            }
            if (!out.table.includes('Role')) {
                return { ok: false, reason: 'expected "Role" header in ASCII table' };
            }
            if (!out.table.includes('Alice')) {
                return { ok: false, reason: 'expected "Alice" row in ASCII table' };
            }
            if (!out.table.includes('Bob')) {
                return { ok: false, reason: 'expected "Bob" row in ASCII table' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { width: unknown };
            if (typeof out.width !== 'number' || out.width < 1) {
                return { ok: false, reason: 'output.width must be a positive number' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
