/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from './output-field.js';

export interface InsertedNearAnchorInput {
    fileContent: string;
    insertedLine: number; // 1-based
    anchorFunctionName: string;
    maxDistance: number;
    language: 'php' | 'typescript' | 'javascript' | 'python';
}

const FUNCTION_PATTERNS: Record<string, RegExp> = {
    php: /function\s+(\w+)\s*\(/,
    typescript: /(?:function|async)\s+(\w+)\s*\(|(\w+)\s*\([^)]*\)\s*(?::\s*\S+)?\s*\{/,
    javascript: /function\s+(\w+)\s*\(/,
    python: /def\s+(\w+)\s*\(/,
};

/**
 * Verifies that when a tool claims to have inserted content after an anchor function,
 * the actual inserted line is within a reasonable distance of the anchor.
 *
 * Catches the class of bug where an anchor like "hasAnyChange" matches the string
 * anywhere in the file and the insertion happens at the wrong location.
 */
export function insertedNearAnchor(input: InsertedNearAnchorInput): InvariantResult {
    const pattern = FUNCTION_PATTERNS[input.language];
    if (!pattern) {
        return { ok: true, reason: `unsupported language "${input.language}" — check skipped` };
    }
    const lines = input.fileContent.split('\n');
    let anchorLine: number | null = null;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(pattern);
        // First capture or second capture (TS pattern has two)
        const name = m?.[1] ?? m?.[2];
        if (name === input.anchorFunctionName) {
            anchorLine = i + 1; // 1-based
            break;
        }
    }
    if (anchorLine === null) {
        return {
            ok: false,
            reason: `anchor function "${input.anchorFunctionName}" not found in file`,
        };
    }
    const distance = Math.abs(input.insertedLine - anchorLine);
    if (distance > input.maxDistance) {
        return {
            ok: false,
            reason: `inserted line ${input.insertedLine} is too far from anchor "${input.anchorFunctionName}" at line ${anchorLine} (distance ${distance} > max ${input.maxDistance})`,
        };
    }
    return { ok: true };
}
