/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedContent: string): InvariantResult[] {
    const o = output as { content?: unknown; path?: unknown; error?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'content'),
        inv.outputHasField(output, 'path'),
        (() => {
            if (o.error !== undefined) {
                return { ok: false, reason: `expected no error, got ${String(o.error)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.content !== expectedContent) {
                return {
                    ok: false,
                    reason: `expected content='${expectedContent}', got ${String(o.content)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.path !== 'string' || o.path.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty path string, got ${String(o.path)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
