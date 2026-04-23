// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RenSymbolInput {
    readonly dir: string;
    readonly oldName: string;
    readonly newName: string;
    readonly apply?: boolean;
}

export interface SymbolChange {
    file: string;
    line: number;
    before: string;
    after: string;
}

export interface RenSymbolOutput {
    changes: SymbolChange[];
    totalFiles: number;
    totalChanges: number;
    applied: boolean;
}

export interface RenFileInput {
    readonly path: string;
    readonly newName: string;
    readonly dir?: string;
    readonly apply?: boolean;
}

export interface ImportUpdate {
    file: string;
    oldImport: string;
    newImport: string;
}

export interface RenFileOutput {
    renamed: boolean;
    oldPath: string;
    newPath: string;
    importsUpdated: ImportUpdate[];
    applied: boolean;
}

export interface RenameEntry {
    readonly oldName: string;
    readonly newName: string;
}

export interface RenBulkInput {
    readonly dir: string;
    readonly renames: readonly RenameEntry[];
    readonly apply?: boolean;
}

export interface BulkRenameResult {
    oldName: string;
    newName: string;
    changes: SymbolChange[];
    totalChanges: number;
}

export interface RenBulkOutput {
    results: BulkRenameResult[];
    totalFiles: number;
    totalChanges: number;
    applied: boolean;
}

export interface RenPreviewInput {
    readonly dir: string;
    readonly oldName: string;
}

export interface Occurrence {
    file: string;
    line: number;
    context: string;
}

export interface RenPreviewOutput {
    occurrences: Occurrence[];
    fileCount: number;
    total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function collectFiles(dir: string, results: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, results);
        } else if (SUPPORTED_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

async function readFileText(filePath: string): Promise<string | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

// ─── renSymbol ────────────────────────────────────────────────────────────────

export async function renSymbol(input: RenSymbolInput): Promise<RenSymbolOutput> {
    const dir = resolve(input.dir);
    const apply = input.apply ?? false;
    const pattern = new RegExp(`\\b${escapeRegex(input.oldName)}\\b`, 'g');

    const files: string[] = [];
    await collectFiles(dir, files);

    const changes: SymbolChange[] = [];
    let totalFiles = 0;

    for (const filePath of files) {
        const content = await readFileText(filePath);
        if (content === null) continue;

        if (!pattern.test(content)) continue;
        pattern.lastIndex = 0;

        const lines = content.split('\n');
        const fileChanges: SymbolChange[] = [];
        const newLines: string[] = [];
        let fileModified = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] as string;
            if (pattern.test(line)) {
                pattern.lastIndex = 0;
                const newLine = line.replace(pattern, input.newName);
                fileChanges.push({
                    file: relative(dir, filePath),
                    line: i + 1,
                    before: line,
                    after: newLine,
                });
                newLines.push(newLine);
                fileModified = true;
            } else {
                pattern.lastIndex = 0;
                newLines.push(line);
            }
        }

        if (fileModified) {
            totalFiles++;
            changes.push(...fileChanges);
            if (apply) {
                await writeFile(filePath, newLines.join('\n'), 'utf-8');
            }
        }
    }

    return {
        changes,
        totalFiles,
        totalChanges: changes.length,
        applied: apply,
    };
}

// ─── renFile ──────────────────────────────────────────────────────────────────

export async function renFile(input: RenFileInput): Promise<RenFileOutput> {
    const oldPath = resolve(input.path);
    const fileDir = dirname(oldPath);
    const newPath = join(fileDir, input.newName);
    const apply = input.apply ?? false;
    const searchDir = input.dir ? resolve(input.dir) : fileDir;

    const oldBase = basename(oldPath);
    const oldBaseStem = oldBase.replace(/\.[^.]+$/, '');
    const newBaseStem = input.newName.replace(/\.[^.]+$/, '');

    const importsUpdated: ImportUpdate[] = [];

    const files: string[] = [];
    await collectFiles(searchDir, files);

    for (const filePath of files) {
        if (filePath === oldPath) continue;

        const content = await readFileText(filePath);
        if (content === null) continue;

        const fileDirectory = dirname(filePath);
        const relativeToOld = relative(fileDirectory, join(fileDir, oldBaseStem));
        const relativeToNew = relative(fileDirectory, join(fileDir, newBaseStem));

        // Normalise to forward slashes and ensure leading ./
        const normaliseImport = (p: string): string => {
            const fwd = p.replace(/\\/g, '/');
            return fwd.startsWith('.') ? fwd : `./${fwd}`;
        };

        const oldImportPath = normaliseImport(relativeToOld);
        const newImportPath = normaliseImport(relativeToNew);

        if (oldImportPath === newImportPath) continue;

        const importPattern = new RegExp(`(from\\s+['"])${escapeRegex(oldImportPath)}(['"])`, 'g');

        if (!importPattern.test(content)) continue;
        importPattern.lastIndex = 0;

        const newContent = content.replace(importPattern, `$1${newImportPath}$2`);

        importsUpdated.push({
            file: relative(searchDir, filePath),
            oldImport: oldImportPath,
            newImport: newImportPath,
        });

        if (apply) {
            await writeFile(filePath, newContent, 'utf-8');
        }
    }

    if (apply) {
        await rename(oldPath, newPath);
    }

    return {
        renamed: apply,
        oldPath: relative(searchDir, oldPath),
        newPath: relative(searchDir, newPath),
        importsUpdated,
        applied: apply,
    };
}

// ─── renBulk ──────────────────────────────────────────────────────────────────

export async function renBulk(input: RenBulkInput): Promise<RenBulkOutput> {
    const apply = input.apply ?? false;
    const results: BulkRenameResult[] = [];
    const affectedFiles = new Set<string>();

    for (const entry of input.renames) {
        const result = await renSymbol({
            dir: input.dir,
            oldName: entry.oldName,
            newName: entry.newName,
            apply,
        });

        results.push({
            oldName: entry.oldName,
            newName: entry.newName,
            changes: result.changes,
            totalChanges: result.totalChanges,
        });

        for (const change of result.changes) {
            affectedFiles.add(change.file);
        }
    }

    const totalChanges = results.reduce((sum, r) => sum + r.totalChanges, 0);

    return {
        results,
        totalFiles: affectedFiles.size,
        totalChanges,
        applied: apply,
    };
}

// ─── renPreview ───────────────────────────────────────────────────────────────

export async function renPreview(input: RenPreviewInput): Promise<RenPreviewOutput> {
    const dir = resolve(input.dir);
    const pattern = new RegExp(`\\b${escapeRegex(input.oldName)}\\b`, 'g');

    const files: string[] = [];
    await collectFiles(dir, files);

    const occurrences: Occurrence[] = [];
    const filesSeen = new Set<string>();

    for (const filePath of files) {
        const content = await readFileText(filePath);
        if (content === null) continue;

        if (!pattern.test(content)) continue;
        pattern.lastIndex = 0;

        const lines = content.split('\n');
        let found = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] as string;
            if (pattern.test(line)) {
                pattern.lastIndex = 0;
                occurrences.push({
                    file: relative(dir, filePath),
                    line: i + 1,
                    context: line.trim(),
                });
                found = true;
            } else {
                pattern.lastIndex = 0;
            }
        }

        if (found) filesSeen.add(filePath);
    }

    return {
        occurrences,
        fileCount: filesSeen.size,
        total: occurrences.length,
    };
}
