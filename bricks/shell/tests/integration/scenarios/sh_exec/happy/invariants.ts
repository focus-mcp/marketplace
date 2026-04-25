/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'stdout'),
        inv.outputHasField(output, 'exitCode'),
        inv.outputHasField(output, 'duration'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { stdout: unknown };
            if (typeof o.stdout !== 'string') {
                return { ok: false, reason: 'expected stdout to be a string' };
            }
            if (!o.stdout.includes('hello')) {
                return {
                    ok: false,
                    reason: `expected stdout to contain "hello", got "${o.stdout.trim()}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { exitCode: unknown };
            if (o.exitCode !== 0) {
                return {
                    ok: false,
                    reason: `expected exitCode=0, got ${String(o.exitCode)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { duration: unknown };
            if (typeof o.duration !== 'number' || o.duration < 0) {
                return { ok: false, reason: `expected duration>=0, got ${String(o.duration)}` };
            }
            return { ok: true };
        })(),
    ];
}
