/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'report'),
        inv.outputHasField(output, 'format'),
        (() => {
            const o = output as { format: unknown };
            if (o.format !== 'markdown') {
                return {
                    ok: false,
                    reason: `expected format="markdown", got ${String(o.format)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { report: unknown };
            if (typeof o.report !== 'string') {
                return { ok: false, reason: 'output.report must be a string' };
            }
            return { ok: true };
        })(),
        // Verify markdown heading present
        (() => {
            const o = output as { report: string };
            if (typeof o.report !== 'string') return { ok: true };
            if (!o.report.includes('# Full Audit Report')) {
                return {
                    ok: false,
                    reason: 'expected "# Full Audit Report" heading in markdown report',
                };
            }
            return { ok: true };
        })(),
        // Verify score is present in report
        (() => {
            const o = output as { report: string };
            if (typeof o.report !== 'string') return { ok: true };
            if (!o.report.includes('Score:')) {
                return { ok: false, reason: 'expected "Score:" in markdown report' };
            }
            return { ok: true };
        })(),
        // Verify code findings section is present
        (() => {
            const o = output as { report: string };
            if (typeof o.report !== 'string') return { ok: true };
            if (!o.report.includes('## Code Quality Findings')) {
                return {
                    ok: false,
                    reason: 'expected "## Code Quality Findings" section in markdown report',
                };
            }
            return { ok: true };
        })(),
        // Verify security findings section is present
        (() => {
            const o = output as { report: string };
            if (typeof o.report !== 'string') return { ok: true };
            if (!o.report.includes('## Security Findings')) {
                return {
                    ok: false,
                    reason: 'expected "## Security Findings" section in markdown report',
                };
            }
            return { ok: true };
        })(),
    ];
}
