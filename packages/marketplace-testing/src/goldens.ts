/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile } from 'node:fs/promises';

export interface GoldenMetrics {
    native?: { tokens: number; turns: number; duration_ms: number };
    brick?: { tokens: number; turns: number; duration_ms: number };
    notes?: string;
}

/**
 * Compares actual output to a committed golden file.
 * Throws with a preview of the diff on mismatch.
 */
export async function expectMatchesGolden(actual: string, goldenPath: string): Promise<void> {
    const expected = await readFile(goldenPath, 'utf-8');
    if (actual === expected) return;

    const preview = (s: string) => (s.length > 200 ? s.slice(0, 200) + '...' : s);
    throw new Error(
        `Golden mismatch at ${goldenPath}\n` +
            `--- expected (${expected.length} chars) ---\n${preview(expected)}\n` +
            `--- actual (${actual.length} chars) ---\n${preview(actual)}\n`,
    );
}

/**
 * Reads a metrics.json golden sibling file.
 */
export async function readMetrics(metricsPath: string): Promise<GoldenMetrics> {
    const raw = await readFile(metricsPath, 'utf-8');
    return JSON.parse(raw) as GoldenMetrics;
}
