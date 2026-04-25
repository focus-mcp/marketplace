/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'guide'),
        inv.outputHasField(output, 'sections'),
        inv.outputSizeUnder(16384)(output),
        (() => {
            const o = output as { guide: unknown };
            if (typeof o.guide !== 'string' || o.guide.length === 0) {
                return { ok: false, reason: 'expected guide to be a non-empty string' };
            }
            if (!o.guide.startsWith('# Contributor guide')) {
                return {
                    ok: false,
                    reason: `expected guide to start with "# Contributor guide", got "${o.guide.slice(0, 40)}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { sections: unknown };
            if (!Array.isArray(o.sections)) {
                return { ok: false, reason: 'expected sections to be an array' };
            }
            if (o.sections.length === 0) {
                return { ok: false, reason: 'expected sections to be non-empty' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { guide: string };
            const expectedSections = [
                '## What to read first',
                '## Project overview',
                '## Architecture',
                '## Coding standards',
            ];
            for (const section of expectedSections) {
                if (!o.guide.includes(section)) {
                    return { ok: false, reason: `expected guide to contain "${section}"` };
                }
            }
            return { ok: true };
        })(),
    ];
}
