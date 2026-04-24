// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { copyFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

// ─── workRoot ─────────────────────────────────────────────────────────────────

/**
 * Canonical work root — all paths are resolved relative to this directory and
 * sandboxed inside it. Defaults to the CWD at module load time so the brick
 * always operates in the directory the MCP server was started from, NOT in
 * whatever CWD the agent happens to have at call time.
 */
let _workRoot: string = resolve(process.cwd());

export function getWorkRoot(): string {
    return _workRoot;
}

/** Override the work root (useful for tests and the setRoot tool). */
export function setWorkRoot(root: string): void {
    _workRoot = resolve(root);
}

/**
 * Resolve `input` relative to workRoot, then verify via realpath that the
 * canonical path stays inside workRoot. Throws if the resolved path escapes.
 */
async function safePath(input: string): Promise<string> {
    // Resolve relative to workRoot so "./foo.ts" targets workRoot/foo.ts
    const joined = resolve(_workRoot, input);

    // realpath resolves symlinks — prevents symlink escape attacks
    // We use the parent directory if the target doesn't exist yet (e.g. copy dest)
    let canonical: string;
    try {
        canonical = await realpath(joined);
    } catch {
        // File doesn't exist yet; resolve the parent to check containment
        const parent = await realpath(resolve(joined, '..')).catch(() => {
            throw new Error(`Path escapes workRoot: ${joined}`);
        });
        canonical = join(parent, joined.slice(resolve(joined, '..').length + 1));
    }

    if (!canonical.startsWith(`${_workRoot}/`) && canonical !== _workRoot) {
        throw new Error(
            `Path "${input}" resolves to "${canonical}" which is outside workRoot "${_workRoot}"`,
        );
    }

    return canonical;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FoMoveInput {
    readonly from: string;
    readonly to: string;
}

export interface FoCopyInput {
    readonly from: string;
    readonly to: string;
}

export interface FoDeleteInput {
    readonly path: string;
}

export interface FoRenameInput {
    readonly path: string;
    readonly name: string;
}

export type FoBatchOp =
    | ({ op: 'move' } & FoMoveInput)
    | ({ op: 'copy' } & FoCopyInput)
    | ({ op: 'delete' } & FoDeleteInput)
    | ({ op: 'rename' } & FoRenameInput);

export interface FoBatchInput {
    readonly ops: readonly FoBatchOp[];
}

export interface FoBatchOutput {
    results: Array<
        | { op: 'move'; moved: boolean; from: string; to: string }
        | { op: 'copy'; copied: boolean; from: string; to: string }
        | { op: 'delete'; deleted: boolean; path: string }
        | { op: 'rename'; renamed: boolean; from: string; to: string }
    >;
}

// ─── Operations ───────────────────────────────────────────────────────────────

export async function foMove(
    input: FoMoveInput,
): Promise<{ moved: boolean; from: string; to: string }> {
    const from = await safePath(input.from);
    const to = await safePath(input.to);
    await rename(from, to);
    return { moved: true, from, to };
}

export async function foCopy(
    input: FoCopyInput,
): Promise<{ copied: boolean; from: string; to: string }> {
    const from = await safePath(input.from);
    const to = await safePath(input.to);
    await copyFile(from, to);
    return { copied: true, from, to };
}

export async function foDelete(input: FoDeleteInput): Promise<{ deleted: boolean; path: string }> {
    const target = await safePath(input.path);
    const info = await stat(target);
    if (info.isDirectory()) {
        await rm(target, { recursive: false });
    } else {
        await rm(target);
    }
    return { deleted: true, path: target };
}

export async function foRename(
    input: FoRenameInput,
): Promise<{ renamed: boolean; from: string; to: string }> {
    const from = await safePath(input.path);
    const to = join(dirname(from), input.name);
    // Ensure the rename target also stays inside workRoot
    if (!to.startsWith(`${_workRoot}/`) && to !== _workRoot) {
        throw new Error(`Rename target "${to}" would escape workRoot "${_workRoot}"`);
    }
    await rename(from, to);
    return { renamed: true, from, to };
}

export async function foBatch(input: FoBatchInput): Promise<FoBatchOutput> {
    const results: FoBatchOutput['results'] = [];
    for (const op of input.ops) {
        switch (op.op) {
            case 'move':
                results.push({ op: 'move', ...(await foMove(op)) });
                break;
            case 'copy':
                results.push({ op: 'copy', ...(await foCopy(op)) });
                break;
            case 'delete':
                results.push({ op: 'delete', ...(await foDelete(op)) });
                break;
            case 'rename':
                results.push({ op: 'rename', ...(await foRename(op)) });
                break;
        }
    }
    return { results };
}
