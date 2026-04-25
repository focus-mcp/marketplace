/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'pattern'),
        inv.outputHasField(output, 'layers'),
        inv.outputHasField(output, 'issues'),
        (() => {
            const o = output as { pattern: unknown };
            if (typeof o.pattern !== 'string' || o.pattern.length === 0) {
                return { ok: false, reason: 'expected non-empty pattern string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { layers: unknown };
            if (!Array.isArray(o.layers)) {
                return { ok: false, reason: 'output.layers must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { layers: unknown[] };
            if (!Array.isArray(o.layers) || o.layers.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one detected layer in MVC-structured sandbox',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { pattern: string };
            if (o.pattern === 'unknown') {
                return {
                    ok: false,
                    reason: 'expected a recognized pattern (not "unknown") for MVC sandbox',
                };
            }
            return { ok: true };
        })(),
    ];
}
