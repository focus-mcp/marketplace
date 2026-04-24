// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ceDeleteSafe,
    ceInsertAfter,
    ceInsertBefore,
    ceReplaceBody,
    findFunctionBounds,
    findPhpFunctionBounds,
    makeDiff,
} from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-codeedit-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── findFunctionBounds ───────────────────────────────────────────────────────

describe('findFunctionBounds', () => {
    it('finds a simple function declaration', () => {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional test string containing template literal syntax
        const lines = ['function greet(name: string) {', '    return `Hello ${name}`;', '}'];
        const bounds = findFunctionBounds(lines, 'greet');
        expect(bounds).not.toBeNull();
        expect(bounds?.startLine).toBe(1);
        expect(bounds?.endLine).toBe(3);
    });

    it('finds an exported async function', () => {
        const lines = [
            'export async function fetchData(url: string) {',
            '    const res = await fetch(url);',
            '    return res.json();',
            '}',
        ];
        const bounds = findFunctionBounds(lines, 'fetchData');
        expect(bounds).not.toBeNull();
        expect(bounds?.startLine).toBe(1);
        expect(bounds?.endLine).toBe(4);
    });

    it('finds a const arrow function', () => {
        const lines = ['const add = (a: number, b: number) => {', '    return a + b;', '};'];
        const bounds = findFunctionBounds(lines, 'add');
        expect(bounds).not.toBeNull();
        expect(bounds?.startLine).toBe(1);
    });

    it('returns null for unknown function name', () => {
        const lines = ['function foo() {', '    return 1;', '}'];
        const bounds = findFunctionBounds(lines, 'bar');
        expect(bounds).toBeNull();
    });
});

// ─── findPhpFunctionBounds — Bug B reproduction ───────────────────────────────

describe('findPhpFunctionBounds', () => {
    it('finds a compact single-line PHP method body (Bug B reproduction)', () => {
        const text = `<?php
class GitRepository {
    public function hasAnyChange(): bool
    {
        return !empty($this->getChanges());
    }
}`;
        const bounds = findPhpFunctionBounds(text, 'hasAnyChange');
        expect(bounds).not.toBeNull();
        expect(bounds?.startLine).toBeGreaterThan(0);
        expect(bounds?.endLine).toBeGreaterThan(bounds?.startLine ?? 0);
    });

    it('finds a multi-line PHP method', () => {
        const text = `<?php
class Foo {
    public function compute(int $x): int
    {
        $a = $x * 2;
        $b = $a + 1;
        return $b;
    }
}`;
        const bounds = findPhpFunctionBounds(text, 'compute');
        expect(bounds).not.toBeNull();
        expect(bounds?.startLine).toBeGreaterThan(0);
    });

    it('finds a standalone PHP function', () => {
        const text = `<?php
function greet(string $name): string {
    return 'Hello ' . $name;
}`;
        const bounds = findPhpFunctionBounds(text, 'greet');
        expect(bounds).not.toBeNull();
    });

    it('returns null for an unknown function name', () => {
        const text = `<?php
function foo(): void {
    echo 'hello';
}`;
        const bounds = findPhpFunctionBounds(text, 'bar');
        expect(bounds).toBeNull();
    });
});

// ─── ceReplaceBody ────────────────────────────────────────────────────────────

describe('ceReplaceBody', () => {
    it('returns found=false for non-existent function', async () => {
        const filePath = await makeFile(
            'sample.ts',
            'export function greet() {\n    return "hello";\n}\n',
        );
        const result = await ceReplaceBody({
            path: filePath,
            name: 'nonExistent',
            newBody: '    return "world";',
        });
        expect(result.found).toBe(false);
    });

    it('returns found=false for non-existent file', async () => {
        const result = await ceReplaceBody({
            path: join(testDir, 'missing.ts'),
            name: 'foo',
            newBody: 'return 1;',
        });
        expect(result.found).toBe(false);
    });

    it('detects the function without applying', async () => {
        const original = 'export function greet() {\n    return "hello";\n}\n';
        const filePath = await makeFile('sample.ts', original);

        const result = await ceReplaceBody({
            path: filePath,
            name: 'greet',
            newBody: '    return "world";',
            apply: false,
        });

        expect(result.found).toBe(true);
        expect(result.startLine).toBe(1);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });

    it('replaces function body when apply=true', async () => {
        const filePath = await makeFile(
            'sample.ts',
            'export function greet() {\n    return "hello";\n}\n',
        );

        const result = await ceReplaceBody({
            path: filePath,
            name: 'greet',
            newBody: '    return "world";',
            apply: true,
        });

        expect(result.found).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('"world"');
        expect(content).not.toContain('"hello"');
    });

    it('provides before/after preview', async () => {
        const filePath = await makeFile(
            'sample.ts',
            'function compute(x: number) {\n    return x * 2;\n}\n',
        );

        const result = await ceReplaceBody({
            path: filePath,
            name: 'compute',
            newBody: '    return x * 3;',
        });

        expect(result.found).toBe(true);
        expect(result.preview.before).toContain('x * 2');
        expect(result.preview.after).toContain('x * 3');
    });

    it('dryRun returns preview without writing', async () => {
        const original = 'export function foo() {\n    return 1;\n}\n';
        const filePath = await makeFile('sample.ts', original);

        const result = await ceReplaceBody({
            path: filePath,
            name: 'foo',
            newBody: '    return 99;',
            dryRun: true,
            apply: true,
        });

        expect(result.found).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });

    it('replaces PHP single-line method body (Bug B fix)', async () => {
        const original = `<?php
class GitRepository {
    public function hasAnyChange(): bool
    {
        return !empty($this->getChanges());
    }
}
`;
        const filePath = await makeFile('GitRepository.php', original);

        const result = await ceReplaceBody({
            path: filePath,
            name: 'hasAnyChange',
            newBody: '        return true;',
            apply: false,
        });

        expect(result.found).toBe(true);
        expect(result.startLine).toBeGreaterThan(0);
        expect(result.endLine).toBeGreaterThan(result.startLine);
        expect(result.preview.before).toContain('hasAnyChange');
    });

    it('replaces PHP multi-line method body', async () => {
        const original = `<?php
class Foo {
    public function compute(int $x): int
    {
        $a = $x * 2;
        $b = $a + 1;
        return $b;
    }
}
`;
        const filePath = await makeFile('Foo.php', original);

        const result = await ceReplaceBody({
            path: filePath,
            name: 'compute',
            newBody: '        return $x * 10;',
            apply: true,
        });

        expect(result.found).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('$x * 10');
        expect(content).not.toContain('$x * 2');
    });
});

// ─── ceInsertAfter ────────────────────────────────────────────────────────────

describe('ceInsertAfter', () => {
    it('inserts after a specific line number', async () => {
        const filePath = await makeFile('file.ts', 'line1\nline2\nline3\n');

        const result = await ceInsertAfter({
            path: filePath,
            after: 1,
            content: 'inserted',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        expect(lines[0]).toBe('line1');
        expect(lines[1]).toBe('inserted');
        expect(lines[2]).toBe('line2');
    });

    it('inserts after a pattern match', async () => {
        const filePath = await makeFile(
            'file.ts',
            'import A from "./a";\nimport B from "./b";\n\nexport function foo() {}\n',
        );

        const result = await ceInsertAfter({
            path: filePath,
            pattern: 'import B',
            content: 'import C from "./c";',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('import C from "./c";');
        const lines = content.split('\n');
        const bIdx = lines.findIndex((l) => l.includes('import B'));
        const cIdx = lines.findIndex((l) => l.includes('import C'));
        expect(cIdx).toBe(bIdx + 1);
    });

    it('returns inserted=false when no line or pattern provided', async () => {
        const filePath = await makeFile('file.ts', 'line1\nline2\n');
        const result = await ceInsertAfter({ path: filePath, content: 'x' });
        expect(result.inserted).toBe(false);
    });

    it('does not modify file when apply=false', async () => {
        const original = 'line1\nline2\n';
        const filePath = await makeFile('file.ts', original);
        await ceInsertAfter({ path: filePath, after: 1, content: 'inserted', apply: false });
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });

    it('returns inserted=false with matches list when pattern is ambiguous (Bug A fix)', async () => {
        const fileContent = [
            '<?php',
            'class Foo {',
            '    public function hasAnyChange(): bool',
            '    {',
            '        return !empty($this->changes);',
            '    }',
            '',
            '    public function commit(): void',
            '    {',
            '        if ($this->hasAnyChange()) {',
            '            $this->doCommit();',
            '        }',
            '    }',
            '}',
        ].join('\n');

        const filePath = await makeFile('Repo.php', fileContent);

        const result = await ceInsertAfter({
            path: filePath,
            pattern: 'hasAnyChange',
            content: '    // injected code',
            apply: true,
        });

        expect(result.inserted).toBe(false);
        expect(result.error).toMatch(/Ambiguous pattern/);
        expect(result.matches).toBeDefined();
        expect((result.matches ?? []).length).toBeGreaterThan(1);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(fileContent);
    });

    it('disambiguates with lineHint and inserts at correct location', async () => {
        const fileContent = [
            'function hasAnyChange() { return true; }',
            'const x = 1;',
            'const y = hasAnyChange();',
        ].join('\n');

        const filePath = await makeFile('sample.ts', fileContent);

        const result = await ceInsertAfter({
            path: filePath,
            pattern: 'hasAnyChange',
            lineHint: 1,
            content: '// after definition',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        expect(lines[1]).toBe('// after definition');
    });

    it('dryRun returns diff without writing', async () => {
        const original = 'a\nb\nc\n';
        const filePath = await makeFile('file.ts', original);

        const result = await ceInsertAfter({
            path: filePath,
            after: 1,
            content: 'inserted',
            dryRun: true,
        });

        expect(result.inserted).toBe(true);
        expect(result.diff).toBeDefined();
        expect(result.diff).toContain('+inserted');
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });
});

// ─── ceInsertBefore ───────────────────────────────────────────────────────────

describe('ceInsertBefore', () => {
    it('inserts before a specific line number', async () => {
        const filePath = await makeFile('file.ts', 'line1\nline2\nline3\n');

        const result = await ceInsertBefore({
            path: filePath,
            before: 2,
            content: 'inserted',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        expect(lines[0]).toBe('line1');
        expect(lines[1]).toBe('inserted');
        expect(lines[2]).toBe('line2');
    });

    it('inserts before a pattern match', async () => {
        const filePath = await makeFile('file.ts', 'const a = 1;\nconst b = 2;\nconst c = 3;\n');

        const result = await ceInsertBefore({
            path: filePath,
            pattern: 'const b',
            content: '// comment before b',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const bIdx = lines.findIndex((l) => l.includes('const b'));
        expect(lines[bIdx - 1]).toBe('// comment before b');
    });

    it('returns inserted=false when no pattern or line resolves', async () => {
        const filePath = await makeFile('file.ts', 'line1\n');
        const result = await ceInsertBefore({
            path: filePath,
            pattern: 'no-match-xyz',
            content: 'x',
        });
        expect(result.inserted).toBe(false);
    });

    it('does not modify file when apply=false', async () => {
        const original = 'line1\nline2\n';
        const filePath = await makeFile('file.ts', original);
        await ceInsertBefore({ path: filePath, before: 1, content: 'inserted', apply: false });
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });

    it('returns inserted=false with matches list when ambiguous pattern', async () => {
        const fileContent = 'foo\nfoo\nbar\n';
        const filePath = await makeFile('file.ts', fileContent);

        const result = await ceInsertBefore({
            path: filePath,
            pattern: 'foo',
            content: 'injected',
            apply: true,
        });

        expect(result.inserted).toBe(false);
        expect(result.error).toMatch(/Ambiguous pattern/);
        expect((result.matches ?? []).length).toBe(2);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(fileContent);
    });

    it('disambiguates insertBefore with lineHint', async () => {
        const fileContent = 'foo\nbar\nfoo\n';
        const filePath = await makeFile('file.ts', fileContent);

        const result = await ceInsertBefore({
            path: filePath,
            pattern: 'foo',
            lineHint: 3,
            content: 'injected',
            apply: true,
        });

        expect(result.inserted).toBe(true);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const injIdx = lines.indexOf('injected');
        const fooIdx2 = lines.lastIndexOf('foo');
        expect(fooIdx2).toBe(injIdx + 1);
    });

    it('dryRun returns diff without writing', async () => {
        const original = 'a\nb\n';
        const filePath = await makeFile('file.ts', original);

        const result = await ceInsertBefore({
            path: filePath,
            before: 2,
            content: 'x',
            dryRun: true,
        });

        expect(result.inserted).toBe(true);
        expect(result.diff).toContain('+x');
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });
});

// ─── ceDeleteSafe ─────────────────────────────────────────────────────────────

describe('ceDeleteSafe', () => {
    it('blocks deletion when dependents exist', async () => {
        const libFile = await makeFile('lib.ts', 'export function helper() {\n    return 42;\n}\n');
        await makeFile('consumer.ts', 'import { helper } from "./lib";\nhelper();\n');

        const result = await ceDeleteSafe({
            path: libFile,
            name: 'helper',
            dir: testDir,
        });

        expect(result.blocked).toBe(true);
        expect(result.deleted).toBe(false);
        expect(result.dependents.length).toBeGreaterThan(0);
    });

    it('force-deletes even when dependents exist', async () => {
        const libFile = await makeFile('lib.ts', 'export function helper() {\n    return 42;\n}\n');
        await makeFile('consumer.ts', 'import { helper } from "./lib";\nhelper();\n');

        const result = await ceDeleteSafe({
            path: libFile,
            name: 'helper',
            dir: testDir,
            force: true,
            apply: true,
        });

        expect(result.blocked).toBe(false);
        expect(result.deleted).toBe(true);
        expect(result.linesRemoved).toBeGreaterThan(0);

        const content = await readFile(libFile, 'utf-8');
        expect(content).not.toContain('function helper');
    });

    it('deletes safely when no dependents exist', async () => {
        const libFile = await makeFile('lib.ts', 'export function orphan() {\n    return 0;\n}\n');

        const result = await ceDeleteSafe({
            path: libFile,
            name: 'orphan',
            dir: testDir,
            apply: true,
        });

        expect(result.blocked).toBe(false);
        expect(result.deleted).toBe(true);
        expect(result.linesRemoved).toBe(3);

        const content = await readFile(libFile, 'utf-8');
        expect(content).not.toContain('function orphan');
    });

    it('returns deleted=false for non-existent function', async () => {
        const filePath = await makeFile('lib.ts', 'export const x = 1;\n');
        const result = await ceDeleteSafe({ path: filePath, name: 'nonExistent' });
        expect(result.deleted).toBe(false);
        expect(result.blocked).toBe(false);
    });

    it('does not modify file when apply=false', async () => {
        const original = 'export function solo() {\n    return 1;\n}\n';
        const filePath = await makeFile('lib.ts', original);

        await ceDeleteSafe({ path: filePath, name: 'solo', apply: false });
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });

    it('dryRun returns diff without writing', async () => {
        const original = 'export function solo() {\n    return 1;\n}\n';
        const filePath = await makeFile('lib.ts', original);

        const result = await ceDeleteSafe({
            path: filePath,
            name: 'solo',
            dryRun: true,
        });

        expect(result.deleted).toBe(true);
        expect(result.diff).toBeDefined();
        expect(result.diff).toContain('-export function solo');
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(original);
    });
});

// ─── makeDiff ─────────────────────────────────────────────────────────────────

describe('makeDiff', () => {
    it('produces a diff showing additions and removals', () => {
        const orig = ['a', 'b', 'c'];
        const next = ['a', 'x', 'c'];
        const diff = makeDiff(orig, next, 'file.ts');
        expect(diff).toContain('-b');
        expect(diff).toContain('+x');
    });

    it('returns header lines only for identical arrays', () => {
        const orig = ['a', 'b'];
        const diff = makeDiff(orig, orig, 'file.ts');
        expect(diff).not.toContain('@@');
    });
});

// ─── codeedit brick ───────────────────────────────────────────────────────────

describe('codeedit brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('codeedit:replacebody', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('codeedit:insertafter', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('codeedit:insertbefore', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('codeedit:safedelete', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
