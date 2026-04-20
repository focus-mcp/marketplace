// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface FsReadInput {
    readonly path: string;
}
export interface FsWriteInput {
    readonly path: string;
    readonly content: string;
}
export interface FsListInput {
    readonly path: string;
    readonly recursive?: boolean;
}
export interface FsSearchInput {
    readonly path: string;
    readonly pattern: string;
    readonly glob?: string;
}
export interface FsDeleteInput {
    readonly path: string;
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
    const items = await readdir(dir, { recursive: input.recursive ?? false, withFileTypes: true });
    return {
        entries: items.map((e) => {
            const prefix = e.isDirectory() ? 'd ' : 'f ';
            return prefix + e.name;
        }),
    };
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

export async function fsSearch(input: FsSearchInput): Promise<{ matches: string[] }> {
    const dir = resolve(input.path);
    const regex = new RegExp(input.pattern);
    const globFilter = input.glob
        ? new RegExp(input.glob.replace(/\*/g, '.*').replace(/\?/g, '.'))
        : null;
    const items = await readdir(dir, { recursive: true, withFileTypes: true });
    const matches: string[] = [];
    for (const entry of items) {
        if (!entry.isFile()) continue;
        const filePath = join(entry.parentPath ?? dir, entry.name);
        if (globFilter && !globFilter.test(entry.name)) continue;
        const fileMatches = await searchInFile(filePath, regex);
        matches.push(...fileMatches);
    }
    return { matches: matches.slice(0, 100) };
}

export async function fsDelete(input: FsDeleteInput): Promise<{ deleted: boolean; path: string }> {
    const target = resolve(input.path);
    const info = await stat(target);
    if (info.isDirectory()) {
        await rm(target, { recursive: false });
    } else {
        await rm(target);
    }
    return { deleted: true, path: target };
}
