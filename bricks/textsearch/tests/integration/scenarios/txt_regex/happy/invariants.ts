/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'matches'),
        inv.outputHasField(output, 'total'),
        (() => {
            const out = output as { matches: unknown };
            if (!Array.isArray(out.matches)) {
                return { ok: false, reason: 'output.matches must be an array' };
            }
            if (out.matches.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least 1 regex match for class Service pattern',
                };
            }
            return { ok: true };
        })(),
        (() => {
            type Match = { text?: string };
            const out = output as { matches: unknown[] };
            if (!Array.isArray(out.matches)) return { ok: true };
            const hasService = out.matches.some(
                (m) =>
                    typeof (m as Match).text === 'string' && (m as Match).text?.includes('Service'),
            );
            if (!hasService) {
                return {
                    ok: false,
                    reason: 'expected at least one match text to contain "Service"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
