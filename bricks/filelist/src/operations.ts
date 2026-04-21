// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface FlListInput {
    readonly path: string;
}

export interface FlTreeInput {
    readonly path: string;
    readonly depth?: number;
}

export interface FlGlobInput {
    readonly path: string;
    readonly pattern: string;
}

export interface FlFindInput {
    readonly path: string;
    readonly name: string;
}

export async function flList(input: FlListInput): Promise<{ entries: string[] }> {
    const dir = resolve(input.path);
    const items = await readdir(dir, { withFileTypes: true });
    return {
        entries: items.map((e) => (e.isDirectory() ? 'd ' : 'f ') + e.name),
    };
}

async function buildTree(
    dir: string,
    indent: number,
    maxDepth: number | undefined,
): Promise<string[]> {
    if (maxDepth !== undefined && indent >= maxDepth) return [];
    const items = await readdir(dir, { withFileTypes: true });
    const lines: string[] = [];
    for (const entry of items) {
        const prefix = '  '.repeat(indent) + (entry.isDirectory() ? 'd ' : 'f ');
        lines.push(prefix + entry.name);
        if (entry.isDirectory()) {
            const subLines = await buildTree(join(dir, entry.name), indent + 1, maxDepth);
            lines.push(...subLines);
        }
    }
    return lines;
}

export async function flTree(input: FlTreeInput): Promise<{ tree: string[] }> {
    const dir = resolve(input.path);
    const tree = await buildTree(dir, 0, input.depth);
    return { tree };
}

export async function flGlob(input: FlGlobInput): Promise<{ matches: string[] }> {
    const dir = resolve(input.path);
    const pattern = input.pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${pattern}$`);
    const items = await readdir(dir, { recursive: true, withFileTypes: true });
    const matches: string[] = [];
    for (const entry of items) {
        if (!entry.isFile()) continue;
        if (regex.test(entry.name)) {
            matches.push(join(entry.parentPath ?? dir, entry.name));
        }
    }
    return { matches };
}

export async function flFind(input: FlFindInput): Promise<{ matches: string[] }> {
    const dir = resolve(input.path);
    const items = await readdir(dir, { recursive: true, withFileTypes: true });
    const matches: string[] = [];
    for (const entry of items) {
        if (!entry.isFile()) continue;
        if (entry.name.includes(input.name)) {
            matches.push(join(entry.parentPath ?? dir, entry.name));
        }
    }
    return { matches };
}
