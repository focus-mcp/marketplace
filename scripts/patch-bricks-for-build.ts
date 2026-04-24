#!/usr/bin/env tsx
// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * patch-bricks-for-build.ts
 *
 * Idempotent script that patches all bricks to build to dist/ before publish.
 * For each brick it:
 *   1. Updates package.json: main, exports, types, files, scripts.build
 *   2. Writes a tsconfig.json that extends the root tsconfig.build.json
 *   3. Writes a tsconfig.json.license REUSE sidecar if missing
 *
 * Bundle bricks (tools=0, deps>0) still have src/index.ts and are treated
 * identically. If a brick has no src/index.ts it is skipped with a warning.
 *
 * Run: pnpm tsx scripts/patch-bricks-for-build.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const MARKETPLACE_ROOT = path.resolve(import.meta.dirname, '..');
const BRICKS_DIR = path.join(MARKETPLACE_ROOT, 'bricks');

interface PackageJson {
    name: string;
    version: string;
    main?: string;
    types?: string;
    exports?: Record<string, string> | string;
    files?: string[];
    scripts?: Record<string, string>;
    [key: string]: unknown;
}

function writeIfDifferent(filePath: string, content: string): 'written' | 'skipped' {
    let existing: string | null = null;
    try {
        existing = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    if (existing === content) return 'skipped';
    fs.writeFileSync(filePath, content, 'utf-8');
    return 'written';
}

function patchPackageJson(brickDir: string, _brickName: string): 'written' | 'skipped' {
    const pkgPath = path.join(brickDir, 'package.json');
    const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    const original = JSON.stringify(pkg);

    pkg.main = './dist/index.js';
    pkg.types = './dist/index.d.ts';
    pkg.exports = {
        '.': './dist/index.js',
        './mcp-brick.json': './mcp-brick.json',
    };

    const baseFiles = new Set<string>([
        'dist',
        'mcp-brick.json',
        'mcp-brick.json.license',
        'README.md',
    ]);
    if (Array.isArray(pkg.files)) {
        for (const f of pkg.files) {
            if (f !== 'src') baseFiles.add(f);
        }
    }
    pkg.files = [...baseFiles];

    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts['build'] = 'tsc -p tsconfig.json';

    if (JSON.stringify(pkg) === original) return 'skipped';

    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, 'utf-8');
    return 'written';
}

function patchTsConfig(brickDir: string): 'written' | 'skipped' {
    const tscPath = path.join(brickDir, 'tsconfig.json');
    // Content is hand-formatted to match Biome's output (expanded arrays)
    // so the script stays idempotent after lint-staged runs.
    const content = `{
    "extends": "../../tsconfig.build.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": [
        "src/**/*.ts"
    ],
    "exclude": [
        "node_modules",
        "dist",
        "**/*.test.ts",
        "**/*.spec.ts"
    ]
}
`;
    return writeIfDifferent(tscPath, content);
}

function patchTsConfigLicense(brickDir: string): 'written' | 'skipped' {
    const licensePath = path.join(brickDir, 'tsconfig.json.license');
    return writeIfDifferent(
        licensePath,
        'SPDX-FileCopyrightText: 2026 FocusMCP contributors\nSPDX-License-Identifier: MIT\n',
    );
}

interface Counts {
    writtenPkg: number;
    writtenTsc: number;
    skipped: number;
}

function processBrick(
    brickName: string,
    brickDir: string,
    counts: Counts,
    warnings: string[],
): void {
    if (!fs.existsSync(path.join(brickDir, 'package.json'))) {
        warnings.push(`  WARN: ${brickName} — no package.json, skipping`);
        return;
    }

    if (!fs.existsSync(path.join(brickDir, 'src', 'index.ts'))) {
        warnings.push(`  WARN: ${brickName} — no src/index.ts, skipping tsconfig`);
        patchPackageJson(brickDir, brickName);
        return;
    }

    const pkgResult = patchPackageJson(brickDir, brickName);
    const tscResult = patchTsConfig(brickDir);
    const licResult = patchTsConfigLicense(brickDir);

    if (pkgResult === 'written' || tscResult === 'written' || licResult === 'written') {
        counts.writtenPkg += pkgResult === 'written' ? 1 : 0;
        counts.writtenTsc += tscResult === 'written' || licResult === 'written' ? 1 : 0;
        process.stdout.write(
            `  patched  ${brickName} (pkg:${pkgResult} tsc:${tscResult} lic:${licResult})\n`,
        );
    } else {
        counts.skipped++;
    }
}

function main(): void {
    const bricks = fs
        .readdirSync(BRICKS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    const counts: Counts = { writtenPkg: 0, writtenTsc: 0, skipped: 0 };
    const warnings: string[] = [];

    for (const brickName of bricks) {
        processBrick(brickName, path.join(BRICKS_DIR, brickName), counts, warnings);
    }

    process.stdout.write(
        `\nSummary: ${counts.writtenPkg} package.json patched, ${counts.writtenTsc} tsconfig.json written, ${counts.skipped} already up-to-date\n`,
    );
    for (const w of warnings) process.stderr.write(`${w}\n`);
}

main();
