/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

/**
 * fo_rename path-traversal: passing `name = "../escape"` must be rejected.
 * The rename target would escape workRoot — the brick must throw.
 */
export function checkError(err: unknown): InvariantResult[] {
    return [
        (() => {
            if (!(err instanceof Error)) {
                return { ok: false, reason: 'expected an Error to be thrown' };
            }
            return { ok: true };
        })(),
        (() => {
            if (!(err instanceof Error)) return { ok: false, reason: 'not an Error' };
            if (
                !err.message.includes('escape') &&
                !err.message.includes('outside workRoot') &&
                !err.message.includes('workRoot')
            ) {
                return {
                    ok: false,
                    reason: `error should mention workRoot escape, got: ${err.message}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
