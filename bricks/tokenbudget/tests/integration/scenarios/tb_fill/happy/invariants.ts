/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkSelectedEntries(selected: unknown[]): InvariantResult {
    for (const entry of selected) {
        if (
            typeof entry !== 'object' ||
            entry === null ||
            !('path' in entry) ||
            !('tokens' in entry) ||
            !('mode' in entry)
        ) {
            return {
                ok: false,
                reason: 'each selected entry must have path, tokens, and mode fields',
            };
        }
    }
    return { ok: true };
}

function checkFillBudget(selected: unknown[], used: number, remaining: number): InvariantResult {
    if (selected.length === 0) {
        return { ok: false, reason: 'expected at least 1 selected file within budget' };
    }
    if (used > 5000) {
        return { ok: false, reason: `output.used=${used} exceeds budget=5000` };
    }
    if (used + remaining !== 5000) {
        return {
            ok: false,
            reason: `used(${used}) + remaining(${remaining}) must equal budget(5000)`,
        };
    }
    return { ok: true };
}

function checkFillOutput(output: unknown): InvariantResult {
    const out = output as { selected: unknown; used: unknown; remaining: unknown };
    if (!Array.isArray(out.selected)) {
        return { ok: false, reason: 'output.selected must be an array' };
    }
    if (typeof out.used !== 'number' || out.used < 0) {
        return { ok: false, reason: 'output.used must be a non-negative number' };
    }
    if (typeof out.remaining !== 'number' || out.remaining < 0) {
        return { ok: false, reason: 'output.remaining must be a non-negative number' };
    }
    const budgetResult = checkFillBudget(out.selected as unknown[], out.used, out.remaining);
    if (!budgetResult.ok) return budgetResult;
    return checkSelectedEntries(out.selected as unknown[]);
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'selected'),
        inv.outputHasField(output, 'used'),
        inv.outputHasField(output, 'remaining'),
        checkFillOutput(output),
        inv.outputSizeUnder(4096)(output),
    ];
}
