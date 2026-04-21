// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

export interface MrBatchInput {
    readonly paths: string[];
}

export interface MrDedupInput {
    readonly paths: string[];
}

export interface MrMergeInput {
    readonly paths: string[];
    readonly separator?: string;
}

async function readAll(paths: string[]): Promise<Array<[string, string]>> {
    return Promise.all(
        paths.map(async (p) => {
            const content = await readFile(resolve(p), 'utf-8');
            return [p, content] as [string, string];
        }),
    );
}

export async function mrBatch(input: MrBatchInput): Promise<{ files: Record<string, string> }> {
    const entries = await readAll(input.paths);
    return { files: Object.fromEntries(entries) };
}

const IMPORT_PATTERN = /^import\s+|require\(/;

function extractImports(content: string): Set<string> {
    return new Set(
        content
            .split('\n')
            .filter((line) => IMPORT_PATTERN.test(line.trimStart()))
            .map((line) => line.trim()),
    );
}

function intersectSets(sets: Array<Set<string>>): Set<string> {
    if (sets.length === 0) return new Set();
    const first = sets[0];
    if (first === undefined) return new Set();
    const shared = new Set(first);
    for (let i = 1; i < sets.length; i++) {
        const current = sets[i];
        if (current === undefined) continue;
        for (const imp of shared) {
            if (!current.has(imp)) shared.delete(imp);
        }
    }
    return shared;
}

export async function mrDedup(
    input: MrDedupInput,
): Promise<{ sharedImports: string[]; files: Record<string, string> }> {
    const entries = await readAll(input.paths);
    const importSets = entries.map(([, content]) => extractImports(content));
    const shared = intersectSets(importSets);
    const sharedImports = [...shared];

    const files: Record<string, string> = {};
    for (const [p, content] of entries) {
        files[p] = content
            .split('\n')
            .filter((line) => !sharedImports.includes(line.trim()))
            .join('\n');
    }

    return { sharedImports, files };
}

export async function mrMerge(input: MrMergeInput): Promise<{ content: string }> {
    const parts = await Promise.all(
        input.paths.map(async (p) => {
            const content = await readFile(resolve(p), 'utf-8');
            const sep = input.separator !== undefined ? input.separator : `--- ${basename(p)} ---`;
            return `${sep}\n${content}`;
        }),
    );
    return { content: parts.join('\n') };
}
