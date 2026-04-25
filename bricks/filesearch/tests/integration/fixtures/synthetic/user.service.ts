// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    private readonly users: string[] = [];

    findAll(): string[] {
        return this.users;
    }

    create(name: string): void {
        this.users.push(name);
    }
}
