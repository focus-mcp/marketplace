// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Note: .svelte files are NOT part of unit coverage here; component behavior is validated
// by svelte-check (typecheck) and by future end-to-end / component tests. Unit tests target
// .ts logic (api-client, stores, utils) only.
export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        root: projectRoot,
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['**/node_modules/**', '**/build/**', '**/.svelte-kit/**', '**/fixtures/**'],
        reporters: ['default'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            reportsDirectory: resolve(projectRoot, 'coverage'),
            include: ['src/lib/**/*.ts'],
            exclude: [
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/*.d.ts',
                '**/index.ts',
                '**/types/**',
                '**/__tests__/**',
                '**/fixtures/**',
                '**/*.svelte',
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
    },
});
