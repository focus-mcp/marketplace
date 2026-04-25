/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'current'),
        inv.outputHasField(output, 'latest'),
        inv.outputHasField(output, 'stale'),
        inv.outputHasField(output, 'bumpType'),
        inv.outputHasField(output, 'daysBehind'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { current: unknown };
            if (o.current !== '17.0.0') {
                return {
                    ok: false,
                    reason: `expected current="17.0.0", got "${String(o.current)}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { stale: unknown };
            if (o.stale !== true) {
                return {
                    ok: false,
                    reason: `expected stale=true for react@17.0.0, got ${String(o.stale)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { bumpType: unknown };
            if (o.bumpType !== 'major' && o.bumpType !== 'breaking') {
                return {
                    ok: false,
                    reason: `expected bumpType=major or breaking for react 17→current, got "${String(o.bumpType)}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { daysBehind: unknown };
            if (typeof o.daysBehind !== 'number') {
                return { ok: false, reason: 'expected daysBehind to be a number' };
            }
            return { ok: true };
        })(),
    ];
}
