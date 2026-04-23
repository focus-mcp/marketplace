// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepoEntry {
    name: string;
    path: string;
    lastIndexed: string;
}

interface ReposStore {
    repos: RepoEntry[];
}

export interface ReposRegisterInput {
    readonly name: string;
    readonly path: string;
}

export interface ReposUnregisterInput {
    readonly name: string;
}

export interface ReposStatsInput {
    readonly name: string;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

let _reposFile: string | undefined;

export function _setReposFile(path: string | undefined): void {
    _reposFile = path;
}

function getReposFile(): string {
    return _reposFile ?? resolve(join(homedir(), '.focus', 'repos.json'));
}

async function readStore(): Promise<ReposStore> {
    const filePath = getReposFile();
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return { repos: [] };
    try {
        const raw = await fh.readFile('utf-8');
        return JSON.parse(raw) as ReposStore;
    } finally {
        await fh.close();
    }
}

async function writeStore(store: ReposStore): Promise<void> {
    const filePath = getReposFile();
    const fh = await open(filePath, 'w');
    try {
        await fh.writeFile(JSON.stringify(store, null, 2), 'utf-8');
    } finally {
        await fh.close();
    }
}

// ─── reposList ───────────────────────────────────────────────────────────────

export async function reposList(): Promise<{
    repos: Array<{ name: string; path: string; lastIndexed: string }>;
}> {
    const store = await readStore();
    return { repos: store.repos };
}

// ─── reposRegister ───────────────────────────────────────────────────────────

export async function reposRegister(input: ReposRegisterInput): Promise<{ ok: boolean }> {
    const store = await readStore();
    const existing = store.repos.findIndex((r) => r.name === input.name);
    const entry: RepoEntry = {
        name: input.name,
        path: input.path,
        lastIndexed: new Date().toISOString(),
    };
    if (existing >= 0) {
        store.repos[existing] = entry;
    } else {
        store.repos.push(entry);
    }
    await writeStore(store);
    return { ok: true };
}

// ─── reposUnregister ─────────────────────────────────────────────────────────

export async function reposUnregister(input: ReposUnregisterInput): Promise<{ ok: boolean }> {
    const store = await readStore();
    const before = store.repos.length;
    store.repos = store.repos.filter((r) => r.name !== input.name);
    if (store.repos.length === before) return { ok: false };
    await writeStore(store);
    return { ok: true };
}

// ─── reposStats ──────────────────────────────────────────────────────────────

async function countFilesRecursive(
    dir: string,
    languages: Record<string, number>,
): Promise<{ files: number; lines: number }> {
    let files = 0;
    let lines = 0;
    let entries: import('node:fs').Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return { files, lines };
    }
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            const sub = await countFilesRecursive(full, languages);
            files += sub.files;
            lines += sub.lines;
        } else {
            files++;
            const ext = extname(name) || '(none)';
            languages[ext] = (languages[ext] ?? 0) + 1;
            const fh = await open(full, 'r').catch(() => null);
            if (fh) {
                try {
                    const content = await fh.readFile('utf-8');
                    lines += content.split('\n').length;
                } finally {
                    await fh.close();
                }
            }
        }
    }
    return { files, lines };
}

export async function reposStats(
    input: ReposStatsInput,
): Promise<{ files: number; lines: number; languages: Record<string, number> }> {
    const store = await readStore();
    const repo = store.repos.find((r) => r.name === input.name);
    if (!repo) return { files: 0, lines: 0, languages: {} };

    const languages: Record<string, number> = {};
    const { files, lines } = await countFilesRecursive(repo.path, languages);
    return { files, lines, languages };
}
