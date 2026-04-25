/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedClusterId: number): InvariantResult[] {
    const o = output as {
        clusterId?: unknown;
        members?: unknown;
        commonTypes?: unknown;
        hubNodes?: unknown;
        edgeTypes?: unknown;
    };
    return [
        inv.outputHasField(output, 'clusterId'),
        inv.outputHasField(output, 'members'),
        inv.outputHasField(output, 'commonTypes'),
        inv.outputHasField(output, 'hubNodes'),
        inv.outputHasField(output, 'edgeTypes'),
        (() => {
            if (o.clusterId !== expectedClusterId) {
                return {
                    ok: false,
                    reason: `expected clusterId=${expectedClusterId}, got ${String(o.clusterId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.members) || o.members.length === 0) {
                return {
                    ok: false,
                    reason: `expected members to be a non-empty array, got ${JSON.stringify(o.members)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.commonTypes)) {
                return { ok: false, reason: `expected commonTypes to be an array` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.hubNodes)) {
                return { ok: false, reason: `expected hubNodes to be an array` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.edgeTypes)) {
                return { ok: false, reason: `expected edgeTypes to be an array` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
