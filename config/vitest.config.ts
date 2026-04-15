// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    root: projectRoot,
    include: [
      'scripts/**/*.{test,spec}.ts',
      'bricks/**/*.{test,spec}.ts',
      'bricks/**/__tests__/**/*.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/fixtures/**'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: resolve(projectRoot, 'coverage'),
      include: ['scripts/**/*.ts', 'bricks/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/types/**',
        '**/__tests__/**',
        '**/fixtures/**',
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
