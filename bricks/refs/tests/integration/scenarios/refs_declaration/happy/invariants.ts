/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'declaration'),
        (() => {
            const decl = (output as Record<string, unknown>)['declaration'];
            if (decl === null || decl === undefined) {
                return {
                    ok: false,
                    reason: 'declaration must not be null — ModuleCompiler exists in the fixture',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const decl = (output as Record<string, unknown>)['declaration'];
            if (typeof decl !== 'object' || decl === null) {
                return { ok: false, reason: 'declaration must be an object' };
            }
            const d = decl as Record<string, unknown>;
            if (typeof d['file'] !== 'string') {
                return { ok: false, reason: 'declaration.file must be a string' };
            }
            if (typeof d['line'] !== 'number') {
                return { ok: false, reason: 'declaration.line must be a number' };
            }
            if (typeof d['signature'] !== 'string') {
                return { ok: false, reason: 'declaration.signature must be a string' };
            }
            if (typeof d['kind'] !== 'string') {
                return { ok: false, reason: 'declaration.kind must be a string' };
            }
            return { ok: true };
        })(),
        (() => {
            const decl = (output as Record<string, unknown>)['declaration'];
            if (typeof decl !== 'object' || decl === null) return { ok: true };
            const d = decl as Record<string, unknown>;
            if (!String(d['signature']).includes('ModuleCompiler')) {
                return {
                    ok: false,
                    reason: `declaration.signature must mention ModuleCompiler, got: ${String(d['signature'])}`,
                };
            }
            if (d['kind'] !== 'class') {
                return {
                    ok: false,
                    reason: `ModuleCompiler should be a class, got kind: ${String(d['kind'])}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
