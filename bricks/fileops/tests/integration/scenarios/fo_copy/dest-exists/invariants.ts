/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

/**
 * fo_copy dest-exists: Node's `copyFile` (COPYFILE_EXCL not set by default)
 * silently overwrites the destination. We document — not condemn — this behaviour.
 * The invariant asserts the response is still a compact success payload.
 */
export function check(output: unknown): InvariantResult[] {
    return [inv.outputHasField(output, 'copied'), inv.outputSizeUnder(2048)(output)];
}
