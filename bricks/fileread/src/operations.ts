// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface FrReadInput {
    readonly path: string;
}

export interface FrHeadInput {
    readonly path: string;
    readonly lines?: number;
}

export interface FrTailInput {
    readonly path: string;
    readonly lines?: number;
}

export interface FrRangeInput {
    readonly path: string;
    readonly from: number;
    readonly to: number;
}

export async function frRead(input: FrReadInput): Promise<{ content: string }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    return { content };
}

export async function frHead(input: FrHeadInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const n = input.lines ?? 10;
    const lines = content.split('\n').slice(0, n);
    return { lines };
}

export async function frTail(input: FrTailInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const n = input.lines ?? 10;
    const all = content.split('\n');
    const lines = all.slice(Math.max(0, all.length - n));
    return { lines };
}

export async function frRange(input: FrRangeInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const all = content.split('\n');
    const lines = all.slice(input.from - 1, input.to);
    return { lines };
}
