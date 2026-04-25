/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    // ge_obsidian returns Record<string, string> (filename → markdown content)
    return [
        (() => {
            if (typeof output !== 'object' || output === null || Array.isArray(output)) {
                return {
                    ok: false,
                    reason: `expected object (Record<string, string>), got ${typeof output}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'object' || output === null) return { ok: true };
            const keys = Object.keys(output as Record<string, unknown>);
            if (keys.length !== 5) {
                return {
                    ok: false,
                    reason: `expected 5 markdown files (1 per node), got ${keys.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'object' || output === null) return { ok: true };
            const files = output as Record<string, unknown>;
            for (const [filename, content] of Object.entries(files)) {
                if (!filename.endsWith('.md')) {
                    return {
                        ok: false,
                        reason: `expected filename to end with .md, got ${filename}`,
                    };
                }
                if (typeof content !== 'string') {
                    return {
                        ok: false,
                        reason: `expected markdown content to be a string for ${filename}`,
                    };
                }
                if (!content.includes('#')) {
                    return {
                        ok: false,
                        reason: `expected markdown file ${filename} to contain a heading (#)`,
                    };
                }
            }
            return { ok: true };
        })(),
        // outputSizeUnder: 4096 bytes — measured at 339B for 5 nodes, well within budget
        inv.outputSizeUnder(4096)(output),
    ];
}
