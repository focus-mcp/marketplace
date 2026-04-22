// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface FsrchSearchInput {
    readonly path: string;
    readonly pattern: string;
    readonly glob?: string;
}

export interface FsrchReplaceInput {
    readonly path: string;
    readonly pattern: string;
    readonly replacement: string;
}

async function searchInFile(filePath: string, regex: RegExp): Promise<string[]> {
    const matches: string[] = [];
    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line !== undefined && regex.test(line)) {
                matches.push(`${filePath}:${i + 1}: ${line.trim()}`);
            }
        }
    } catch {
        // skip binary/permission errors
    }
    return matches;
}

export async function fsrchSearch(input: FsrchSearchInput): Promise<{ matches: string[] }> {
    const dir = resolve(input.path);
    const regex = new RegExp(input.pattern);
    const globFilter = input.glob
        ? new RegExp(
              `^${input.glob.replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
          )
        : null;
    const items = await readdir(dir, { recursive: true, withFileTypes: true });
    const matches: string[] = [];
    for (const entry of items) {
        if (!entry.isFile()) continue;
        if (globFilter && !globFilter.test(entry.name)) continue;
        const filePath = join(entry.parentPath ?? dir, entry.name);
        const fileMatches = await searchInFile(filePath, regex);
        matches.push(...fileMatches);
    }
    return { matches: matches.slice(0, 100) };
}

export async function fsrchReplace(
    input: FsrchReplaceInput,
): Promise<{ replacements: number; path: string }> {
    const target = resolve(input.path);
    const content = await readFile(target, 'utf-8');
    const regex = new RegExp(input.pattern, 'g');
    let count = 0;
    const updated = content.replace(regex, () => {
        count++;
        return input.replacement;
    });
    await writeFile(target, updated, 'utf-8');
    return { replacements: count, path: target };
}
