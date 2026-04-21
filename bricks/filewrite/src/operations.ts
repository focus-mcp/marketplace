// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface FwWriteInput {
    readonly path: string;
    readonly content: string;
}

export interface FwAppendInput {
    readonly path: string;
    readonly content: string;
}

export interface FwCreateInput {
    readonly path: string;
    readonly content: string;
}

export async function fwWrite(input: FwWriteInput): Promise<{ written: boolean; path: string }> {
    const target = resolve(input.path);
    await writeFile(target, input.content, 'utf-8');
    return { written: true, path: target };
}

export async function fwAppend(input: FwAppendInput): Promise<{ appended: boolean; path: string }> {
    const target = resolve(input.path);
    await appendFile(target, input.content, 'utf-8');
    return { appended: true, path: target };
}

export async function fwCreate(input: FwCreateInput): Promise<{ created: boolean; path: string }> {
    const target = resolve(input.path);
    try {
        await writeFile(target, input.content, { encoding: 'utf-8', flag: 'wx' });
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new Error(`File already exists: ${target}`);
        }
        throw err;
    }
    return { created: true, path: target };
}
