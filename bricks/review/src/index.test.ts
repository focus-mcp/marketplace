// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revArchitecture, revCode, revCompare, revSecurity } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-review-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── revCode ─────────────────────────────────────────────────────────────────

describe('revCode', () => {
    it('returns score 10 for clean file', async () => {
        const p = await makeFile(
            'clean.ts',
            `export function greet(name: string): string {\n    return \`Hello \${name}\`;\n}\n`,
        );
        const result = await revCode({ path: p });
        expect(result.score).toBe(10);
        expect(result.findings).toHaveLength(0);
    });

    it('detects any usage', async () => {
        const p = await makeFile('dirty.ts', `const x: any = 1;\n`);
        const result = await revCode({ path: p });
        expect(result.findings.some((f) => f.type === 'any-usage')).toBe(true);
    });

    it('detects TODO comment', async () => {
        const p = await makeFile('todo.ts', `// TODO: fix this later\nconst x = 1;\n`);
        const result = await revCode({ path: p });
        expect(result.findings.some((f) => f.type === 'todo')).toBe(true);
    });

    it('detects FIXME comment', async () => {
        const p = await makeFile('fixme.ts', `// FIXME: broken logic\nconst y = 2;\n`);
        const result = await revCode({ path: p });
        expect(result.findings.some((f) => f.type === 'todo')).toBe(true);
    });

    it('detects console.log', async () => {
        const p = await makeFile('log.ts', `console.log('debug');\n`);
        const result = await revCode({ path: p });
        expect(result.findings.some((f) => f.type === 'console-log')).toBe(true);
    });

    it('returns score >= 1 even for very dirty file', async () => {
        const lines = [
            `const a: any = 1;`,
            `const b: any = 2;`,
            `const c: any = 3;`,
            `console.log(a);`,
        ].join('\n');
        const p = await makeFile('messy.ts', lines);
        const result = await revCode({ path: p });
        expect(result.score).toBeGreaterThanOrEqual(1);
        expect(result.score).toBeLessThanOrEqual(10);
    });

    it('returns empty findings for non-existent file', async () => {
        const result = await revCode({ path: join(testDir, 'nonexistent.ts') });
        expect(result.findings).toHaveLength(0);
        expect(result.score).toBe(10);
    });
});

// ─── revSecurity ─────────────────────────────────────────────────────────────

describe('revSecurity', () => {
    it('returns low risk for clean file', async () => {
        const p = await makeFile(
            'safe.ts',
            `export const add = (a: number, b: number) => a + b;\n`,
        );
        const result = await revSecurity({ path: p });
        expect(result.riskLevel).toBe('low');
        expect(result.findings).toHaveLength(0);
    });

    it('detects hardcoded password', async () => {
        const p = await makeFile('creds.ts', `const password = 'supersecret';\n`);
        const result = await revSecurity({ path: p });
        expect(result.findings.some((f) => f.type === 'hardcoded-password')).toBe(true);
        expect(result.riskLevel).toBe('high');
    });

    it('detects SQL injection pattern', async () => {
        const query = 'SELECT * FROM users WHERE id = ' + "' + userId";
        const p = await makeFile('sql.ts', `const q = "${query}";\n`);
        const result = await revSecurity({ path: p });
        expect(result.findings.some((f) => f.type === 'sql-injection')).toBe(true);
    });

    it('detects innerHTML assignment', async () => {
        const p = await makeFile('xss.ts', `el.innerHTML = userInput;\n`);
        const result = await revSecurity({ path: p });
        expect(result.findings.some((f) => f.type === 'inner-html')).toBe(true);
    });

    it('returns critical risk for 3+ errors', async () => {
        const content = [
            `const password = 'pass123';`,
            `const secret = 'mysecret';`,
            `const api_key = 'key12345';`,
        ].join('\n');
        const p = await makeFile('multi.ts', content);
        const result = await revSecurity({ path: p });
        expect(result.riskLevel).toBe('critical');
    });

    it('returns empty findings for non-existent file', async () => {
        const result = await revSecurity({ path: join(testDir, 'ghost.ts') });
        expect(result.findings).toHaveLength(0);
        expect(result.riskLevel).toBe('low');
    });
});

// ─── revArchitecture ─────────────────────────────────────────────────────────

describe('revArchitecture', () => {
    it('detects MVC pattern', async () => {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(join(testDir, 'controllers'), { recursive: true });
        await mkdir(join(testDir, 'models'), { recursive: true });
        await mkdir(join(testDir, 'routes'), { recursive: true });
        await writeFile(join(testDir, 'controllers', 'user.ts'), `export class UserController {}`);
        await writeFile(join(testDir, 'models', 'user.ts'), `export interface User {}`);
        await writeFile(join(testDir, 'routes', 'index.ts'), `export default {};`);

        const result = await revArchitecture({ dir: testDir });
        expect(result.pattern).toBe('MVC');
        expect(result.layers.some((l) => l.name === 'controllers')).toBe(true);
    });

    it('detects React component-based pattern', async () => {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(join(testDir, 'components'), { recursive: true });
        await mkdir(join(testDir, 'hooks'), { recursive: true });
        await writeFile(
            join(testDir, 'components', 'Button.tsx'),
            `export const Button = () => null;`,
        );
        await writeFile(join(testDir, 'hooks', 'useData.ts'), `export const useData = () => {};`);

        const result = await revArchitecture({ dir: testDir });
        expect(result.pattern).toBe('React component-based');
    });

    it('reports no-layers issue for empty dir', async () => {
        const result = await revArchitecture({ dir: testDir });
        expect(result.pattern).toBe('unknown');
        expect(result.issues.some((i) => i.type === 'no-layers')).toBe(true);
    });

    it('scans inside src/ if present', async () => {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(join(testDir, 'src', 'services'), { recursive: true });
        await mkdir(join(testDir, 'src', 'utils'), { recursive: true });
        await writeFile(join(testDir, 'src', 'services', 'user.ts'), `export class UserService {}`);
        await writeFile(
            join(testDir, 'src', 'utils', 'helper.ts'),
            `export const noop = () => {};`,
        );

        const result = await revArchitecture({ dir: testDir });
        expect(result.pattern).toBe('Service-oriented');
    });
});

// ─── revCompare ──────────────────────────────────────────────────────────────

describe('revCompare', () => {
    it('returns identical similarity for same file', async () => {
        const content = `const x = 1;\nconst y = 2;\n`;
        const a = await makeFile('a.ts', content);
        const b = await makeFile('b.ts', content);
        const result = await revCompare({ pathA: a, pathB: b });
        expect(result.similarity).toBe(1);
        expect(result.additions).toHaveLength(0);
        expect(result.removals).toHaveLength(0);
    });

    it('detects additions', async () => {
        const a = await makeFile('a.ts', `const x = 1;\n`);
        const b = await makeFile('b.ts', `const x = 1;\nconst y = 2;\n`);
        const result = await revCompare({ pathA: a, pathB: b });
        expect(result.additions.some((line) => line.includes('y = 2'))).toBe(true);
    });

    it('detects removals', async () => {
        const a = await makeFile('a.ts', `const x = 1;\nconst y = 2;\n`);
        const b = await makeFile('b.ts', `const x = 1;\n`);
        const result = await revCompare({ pathA: a, pathB: b });
        expect(result.removals.some((line) => line.includes('y = 2'))).toBe(true);
    });

    it('detects modifications', async () => {
        const a = await makeFile('a.ts', `const x = 1;\n`);
        const b = await makeFile('b.ts', `const x = 99;\n`);
        const result = await revCompare({ pathA: a, pathB: b });
        expect(result.modifications.length).toBeGreaterThan(0);
    });

    it('returns similarity < 1 for different files', async () => {
        const a = await makeFile('a.ts', `const foo = 'hello';\n`);
        const b = await makeFile('b.ts', `const bar = 'world';\n`);
        const result = await revCompare({ pathA: a, pathB: b });
        expect(result.similarity).toBeLessThan(1);
    });

    it('handles non-existent files gracefully', async () => {
        const result = await revCompare({
            pathA: join(testDir, 'ghost-a.ts'),
            pathB: join(testDir, 'ghost-b.ts'),
        });
        expect(result.similarity).toBe(1);
        expect(result.additions).toHaveLength(0);
        expect(result.removals).toHaveLength(0);
    });
});

// ─── brick lifecycle ─────────────────────────────────────────────────────────

describe('review brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('review:code', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('review:security', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('review:architecture', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('review:compare', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
