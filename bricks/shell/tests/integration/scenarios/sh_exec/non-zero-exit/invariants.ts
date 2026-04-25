/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'exitCode'),
        inv.outputHasField(output, 'stdout'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { exitCode: unknown };
            if (o.exitCode !== 1) {
                return {
                    ok: false,
                    reason: `expected exitCode=1 for "false", got ${String(o.exitCode)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { stdout: unknown };
            if (typeof o.stdout !== 'string') {
                return { ok: false, reason: 'expected stdout to be a string' };
            }
            if (o.stdout.trim() !== '') {
                return {
                    ok: false,
                    reason: `expected empty stdout for "false", got "${o.stdout.trim()}"`,
                };
            }
            return { ok: true };
        })(),
    ];
}
