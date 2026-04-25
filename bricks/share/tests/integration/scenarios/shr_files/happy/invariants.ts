/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function checkWrite(output: unknown, expectedFiles: string[]): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'agentId'),
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'count'),
        (() => {
            const o = output as { files: unknown };
            if (!Array.isArray(o.files)) {
                return {
                    ok: false,
                    reason: `expected files to be an array, got ${typeof o.files}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { files: unknown[]; count: unknown };
            if (!Array.isArray(o.files)) return { ok: true };
            if (o.files.length !== expectedFiles.length) {
                return {
                    ok: false,
                    reason: `expected ${expectedFiles.length} files, got ${o.files.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { count: unknown; files: unknown[] };
            if (!Array.isArray(o.files)) return { ok: true };
            if (o.count !== o.files.length) {
                return {
                    ok: false,
                    reason: `expected count=${o.files.length}, got ${String(o.count)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}

export function checkRead(output: unknown, expectedFiles: string[]): InvariantResult[] {
    return checkWrite(output, expectedFiles);
}
