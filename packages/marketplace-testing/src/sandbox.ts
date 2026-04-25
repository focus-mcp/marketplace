/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Sandbox = {
    path: string;
    file: (relPath: string) => string;
    cleanup: () => Promise<void>;
};

export async function createSandbox(prefix = 'fmcp-itest-'): Promise<Sandbox> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    return {
        path: dir,
        file: (relPath) => join(dir, relPath),
        cleanup: () => rm(dir, { recursive: true, force: true }),
    };
}
