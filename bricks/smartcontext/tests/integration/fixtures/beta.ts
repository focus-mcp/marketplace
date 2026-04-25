// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import type { AlphaConfig } from './alpha.js';

export function processAlpha(config: AlphaConfig): string {
    return `${config.name}:${config.value}`;
}
