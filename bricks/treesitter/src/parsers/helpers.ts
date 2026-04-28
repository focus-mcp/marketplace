// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Shared helpers for all language parsers.
 */

import type { TsNode } from './registry.ts';

export function row(node: TsNode): number {
    return node.startPosition.row + 1;
}

export function endRow(node: TsNode): number {
    return node.endPosition.row + 1;
}

export function firstLine(node: TsNode): string {
    const text = node.text;
    const nl = text.indexOf('\n');
    return (nl === -1 ? text : text.slice(0, nl)).trim();
}
