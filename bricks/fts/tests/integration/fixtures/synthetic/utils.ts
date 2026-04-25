// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
    private readonly version = '1.0.0';

    getVersion(): string {
        return this.version;
    }

    formatMessage(msg: string): string {
        return `[INFO] ${msg}`;
    }
}
