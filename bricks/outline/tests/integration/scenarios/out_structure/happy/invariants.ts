/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'tree'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['tree'])) {
                return { ok: false, reason: 'tree must be an array' };
            }
            if ((out['tree'] as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'tree must be non-empty — NestJS injector has subdirectories (helpers, inquirer, etc.)',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const tree = (out['tree'] as unknown[]) ?? [];
            const bad = tree.filter((t) => {
                const entry = t as Record<string, unknown>;
                return (
                    typeof entry['path'] !== 'string' ||
                    typeof entry['files'] !== 'number' ||
                    typeof entry['dirs'] !== 'number' ||
                    typeof entry['extensions'] !== 'object' ||
                    entry['extensions'] === null
                );
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed tree entries: ${bad.length} missing path/files/dirs/extensions`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const tree = (out['tree'] as unknown[]) ?? [];
            // NestJS injector has known subdirs: helpers, inquirer, internal-core-module, lazy-module-loader, etc.
            const knownSubdirs = ['helpers', 'inquirer', 'opaque-key-factory'];
            const paths = tree.map((t) => String((t as Record<string, unknown>)['path'] ?? ''));
            const foundSubdir = knownSubdirs.some((sub) => paths.some((p) => p.includes(sub)));
            if (!foundSubdir) {
                return {
                    ok: false,
                    reason: `expected at least one known injector subdir (${knownSubdirs.join(', ')}) in tree — tests recursive traversal`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
