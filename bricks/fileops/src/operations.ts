// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { copyFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

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

export async function foMove(
    input: FoMoveInput,
): Promise<{ moved: boolean; from: string; to: string }> {
    const from = resolve(input.from);
    const to = resolve(input.to);
    await rename(from, to);
    return { moved: true, from, to };
}

export async function foCopy(
    input: FoCopyInput,
): Promise<{ copied: boolean; from: string; to: string }> {
    const from = resolve(input.from);
    const to = resolve(input.to);
    await copyFile(from, to);
    return { copied: true, from, to };
}

export async function foDelete(input: FoDeleteInput): Promise<{ deleted: boolean; path: string }> {
    const target = resolve(input.path);
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
    const from = resolve(input.path);
    const to = join(dirname(from), input.name);
    await rename(from, to);
    return { renamed: true, from, to };
}
