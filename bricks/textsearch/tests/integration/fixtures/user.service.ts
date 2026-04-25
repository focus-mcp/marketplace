// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    private readonly users: string[] = [];

    addUser(name: string): void {
        this.users.push(name);
    }

    getUsers(): string[] {
        return this.users;
    }
}
