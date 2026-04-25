// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export function processItems(items: string[]): string[] {
    const result: string[] = [];
    for (const item of items) {
        const trimmed = item.trim();
        const upper = trimmed.toUpperCase();
        result.push(upper);
    }
    return result;
}
