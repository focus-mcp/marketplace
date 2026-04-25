// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    private readonly greeting = 'Hello World!';

    getHello(): string {
        return this.greeting;
    }

    getVersion(): string {
        return '1.0.0';
    }
}
