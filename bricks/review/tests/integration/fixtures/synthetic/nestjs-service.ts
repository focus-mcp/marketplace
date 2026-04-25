// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    private readonly users: Map<string, { id: string; name: string }> = new Map();

    // TODO: add pagination
    findAll(): Array<{ id: string; name: string }> {
        return Array.from(this.users.values());
    }

    findOne(id: string): { id: string; name: string } | undefined {
        return this.users.get(id);
    }

    create(id: string, name: string): { id: string; name: string } {
        const user = { id, name };
        this.users.set(id, user);
        // biome-ignore lint/suspicious/noConsole: intentional — fixture for rev_code console-log detection test
        console.log('User created:', id);
        return user;
    }

    remove(id: string): boolean {
        return this.users.delete(id);
    }
}
