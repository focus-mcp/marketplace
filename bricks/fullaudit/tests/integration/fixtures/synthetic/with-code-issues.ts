// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// TODO: refactor this function

export function process(value: unknown): string {
    const typed = value as string;
    // biome-ignore lint/suspicious/noConsole: intentional — fixture for audit_run console-log detection test
    console.log('processing', typed);
    return typed.toUpperCase();
}
