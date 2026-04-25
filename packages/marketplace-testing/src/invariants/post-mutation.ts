/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { InvariantResult } from './output-field.js';

const execAsync = promisify(exec);

type Language = 'typescript' | 'javascript' | 'php' | 'python';

const CHECKERS: Record<Language, (path: string) => string> = {
    typescript: (p) => `node --input-type=module --check < "${p}" || tsc --noEmit "${p}"`,
    javascript: (p) => `node --check "${p}"`,
    php: (p) => `php -l "${p}"`,
    python: (p) => `python3 -c "import ast; ast.parse(open('${p}').read())"`,
};

/**
 * Runs the language-specific syntax checker on the given file.
 * Binary-not-found is gracefully treated as "skipped" (ok=true with reason).
 * Only a real syntax error returns ok=false.
 */
export async function fileSyntaxValid(
    path: string,
    language: Language | string,
): Promise<InvariantResult> {
    const cmd = (CHECKERS as Record<string, (p: string) => string>)[language];
    if (!cmd) {
        return { ok: true, reason: `unsupported language "${language}" — check skipped` };
    }
    try {
        await execAsync(cmd(path));
        return { ok: true };
    } catch (err) {
        const e = err as { code?: number; stderr?: string };
        if (e.code === 127) {
            return { ok: true, reason: `syntax checker for "${language}" not installed — skipped` };
        }
        return { ok: false, reason: `syntax error: ${e.stderr?.slice(0, 200) ?? String(err)}` };
    }
}
