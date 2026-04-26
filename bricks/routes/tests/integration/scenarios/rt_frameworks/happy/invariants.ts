/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as {
        frameworks?: Array<{ name?: unknown; version?: unknown; detected?: unknown }>;
    };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'frameworks'),
        (() => {
            if (!Array.isArray(o.frameworks) || o.frameworks.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least 1 framework, got ${String(o.frameworks?.length ?? 0)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const express = o.frameworks?.find((f) => f.name === 'express');
            if (!express) {
                return {
                    ok: false,
                    reason: `expected 'express' framework detected, got ${JSON.stringify(o.frameworks?.map((f) => f.name))}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const express = o.frameworks?.find((f) => f.name === 'express');
            if (express?.detected !== true) {
                return { ok: false, reason: `express.detected must be true` };
            }
            return { ok: true };
        })(),
    ];
}
