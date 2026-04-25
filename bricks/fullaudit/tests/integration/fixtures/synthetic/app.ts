// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export interface Config {
    host: string;
    port: number;
}

export function buildUrl(config: Config): string {
    return `http://${config.host}:${config.port}`;
}
