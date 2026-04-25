/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as {
        stdout?: unknown;
        stderr?: unknown;
        exitCode?: unknown;
        duration?: unknown;
    };
    return [
        inv.outputHasField(output, 'stdout'),
        inv.outputHasField(output, 'exitCode'),
        inv.outputHasField(output, 'duration'),
        (() => {
            if (o.exitCode !== 0) {
                return { ok: false, reason: `expected exitCode=0, got ${String(o.exitCode)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.stdout !== 'string' || o.stdout.trim().length === 0) {
                return { ok: false, reason: `expected stdout non-empty, got ${String(o.stdout)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.duration !== 'number' || o.duration < 0) {
                return { ok: false, reason: `expected duration >= 0, got ${String(o.duration)}` };
            }
            return { ok: true };
        })(),
    ];
}
