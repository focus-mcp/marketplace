// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export interface AlphaConfig {
    name: string;
    value: number;
}

export function createAlpha(config: AlphaConfig): AlphaConfig {
    return { ...config };
}
