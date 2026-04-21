// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, open, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionData {
    files?: string[];
    context?: string;
    notes?: string;
}

interface SessionFile {
    name: string;
    data: SessionData;
    savedAt: string;
}

export interface SesSaveInput {
    readonly name: string;
    readonly data: SessionData;
}

export interface SesRestoreInput {
    readonly name: string;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

interface InMemorySession {
    operations: number;
    filesAccessed: string[];
    startedAt: string;
}

const inMemorySession: InMemorySession = {
    operations: 0,
    filesAccessed: [],
    startedAt: new Date().toISOString(),
};

export function _resetSession(): void {
    inMemorySession.operations = 0;
    inMemorySession.filesAccessed = [];
    inMemorySession.startedAt = new Date().toISOString();
}

export function _trackFileAccess(file: string): void {
    inMemorySession.operations++;
    if (!inMemorySession.filesAccessed.includes(file)) {
        inMemorySession.filesAccessed.push(file);
    }
}

// ─── Storage dir ─────────────────────────────────────────────────────────────

let _sessionsDir: string | undefined;

export function _setSessionsDir(dir: string | undefined): void {
    _sessionsDir = dir;
}

function getSessionsDir(): string {
    return _sessionsDir ?? resolve(join(homedir(), '.focus', 'sessions'));
}

function sessionFilePath(dir: string, name: string): string {
    return join(dir, `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

// ─── sesSave ─────────────────────────────────────────────────────────────────

export async function sesSave(input: SesSaveInput): Promise<{ ok: boolean; path: string }> {
    const dir = getSessionsDir();
    await ensureDir(dir);
    const filePath = sessionFilePath(dir, input.name);
    const session: SessionFile = {
        name: input.name,
        data: input.data,
        savedAt: new Date().toISOString(),
    };
    const fh = await open(filePath, 'w');
    try {
        await fh.writeFile(JSON.stringify(session, null, 2), 'utf-8');
    } finally {
        await fh.close();
    }
    return { ok: true, path: filePath };
}

// ─── sesRestore ──────────────────────────────────────────────────────────────

export async function sesRestore(
    input: SesRestoreInput,
): Promise<{ data: SessionData | null; savedAt: string | null }> {
    const dir = getSessionsDir();
    const filePath = sessionFilePath(dir, input.name);
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return { data: null, savedAt: null };
    try {
        const raw = await fh.readFile('utf-8');
        const session = JSON.parse(raw) as SessionFile;
        return { data: session.data, savedAt: session.savedAt };
    } finally {
        await fh.close();
    }
}

// ─── sesContext ──────────────────────────────────────────────────────────────

export function sesContext(): {
    operations: number;
    filesAccessed: string[];
    startedAt: string;
} {
    return {
        operations: inMemorySession.operations,
        filesAccessed: [...inMemorySession.filesAccessed],
        startedAt: inMemorySession.startedAt,
    };
}

// ─── sesHistory ──────────────────────────────────────────────────────────────

export async function sesHistory(): Promise<{
    sessions: Array<{ name: string; savedAt: string; fileCount: number }>;
}> {
    const dir = getSessionsDir();
    await ensureDir(dir);
    const files = await readdir(dir);
    const sessions: Array<{ name: string; savedAt: string; fileCount: number }> = [];

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fh = await open(join(dir, file), 'r').catch(() => null);
        if (!fh) continue;
        try {
            const raw = await fh.readFile('utf-8');
            const session = JSON.parse(raw) as SessionFile;
            sessions.push({
                name: session.name,
                savedAt: session.savedAt,
                fileCount: session.data.files?.length ?? 0,
            });
        } finally {
            await fh.close();
        }
    }

    return { sessions };
}
