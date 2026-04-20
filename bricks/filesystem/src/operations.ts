// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface FsReadInput {
    path: string;
}
export interface FsWriteInput {
    path: string;
    content: string;
}
export interface FsListInput {
    path: string;
    recursive?: boolean;
}
export interface FsSearchInput {
    path: string;
    pattern: string;
    glob?: string;
}
export interface FsDeleteInput {
    path: string;
}

export async function fsRead(input: FsReadInput): Promise<{ content: string }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    return { content };
}

export async function fsWrite(input: FsWriteInput): Promise<{ written: boolean; path: string }> {
    await writeFile(resolve(input.path), input.content, 'utf-8');
    return { written: true, path: resolve(input.path) };
}

export async function fsList(input: FsListInput): Promise<{ entries: string[] }> {
    const dir = resolve(input.path);
    const entries = await readdir(dir, {
        recursive: input.recursive ?? false,
        withFileTypes: true,
    });
    return {
        entries: entries.map((e) => {
            const prefix = e.isDirectory() ? 'd ' : 'f ';
            // Build a path relative to the requested directory
            const absolutePath = join(e.parentPath ?? dir, e.name);
            const relativePath = absolutePath.startsWith(`${dir}/`)
                ? absolutePath.slice(dir.length + 1)
                : e.name;
            return prefix + relativePath;
        }),
    };
}

async function searchInFile(filePath: string, regex: RegExp): Promise<string[]> {
    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const hits: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (regex.test(line)) {
                hits.push(`${filePath}:${i + 1}: ${line.trim()}`);
            }
        }
        return hits;
    } catch {
        // skip binary files or permission errors
        return [];
    }
}

export async function fsSearch(input: FsSearchInput): Promise<{ matches: string[] }> {
    const dir = resolve(input.path);
    const regex = new RegExp(input.pattern);
    const globFilter = input.glob
        ? new RegExp(input.glob.replace(/\*/g, '.*').replace(/\?/g, '.'))
        : null;

    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    const matches: string[] = [];

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (globFilter && !globFilter.test(entry.name)) continue;
        const filePath = join(entry.parentPath ?? dir, entry.name);
        matches.push(...(await searchInFile(filePath, regex)));
    }

    return { matches: matches.slice(0, 100) }; // limit to 100 matches
}

export async function fsDelete(input: FsDeleteInput): Promise<{ deleted: boolean; path: string }> {
    const target = resolve(input.path);
    const info = await stat(target);
    if (info.isDirectory()) {
        await rm(target, { recursive: false }); // only empty dirs
    } else {
        await rm(target);
    }
    return { deleted: true, path: target };
}
