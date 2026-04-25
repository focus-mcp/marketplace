// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export function helperFn(x: number): number {
    return x * 2;
}

export function mainFn(): number {
    return helperFn(21);
}
