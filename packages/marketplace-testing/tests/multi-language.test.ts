/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { describe, expect, it, vi } from 'vitest';
import { testMultiLanguage } from '../src/multi-language.js';

// Minimal BrickLike with an optional supportedLanguages on the manifest.
function makeBrick(supportedLanguages?: string[]) {
    return {
        manifest: {
            name: 'test-brick',
            prefix: 'tb',
            tools: [],
            ...(supportedLanguages !== undefined ? { supportedLanguages } : {}),
        },
        handlers: {},
    };
}

const FIXTURES: Record<string, string> = {
    'nestjs-app': 'typescript',
    'django-app': 'python',
    'rails-app': 'ruby',
};

describe('testMultiLanguage', () => {
    it('runs assertion on every fixture when supportedLanguages is absent', async () => {
        const brick = makeBrick(); // no supportedLanguages field
        const called: string[] = [];
        await testMultiLanguage(brick, FIXTURES, async (name, _lang) => {
            called.push(name);
        });
        expect(called.sort()).toEqual(['django-app', 'nestjs-app', 'rails-app']);
    });

    it('runs assertion only for included languages when supportedLanguages is declared', async () => {
        const brick = makeBrick(['typescript', 'python']);
        const called: string[] = [];
        await testMultiLanguage(brick, FIXTURES, async (name, _lang) => {
            called.push(name);
        });
        // ruby fixture should be skipped
        expect(called.sort()).toEqual(['django-app', 'nestjs-app']);
    });

    it('skips all fixtures when supportedLanguages is declared but matches none', async () => {
        const brick = makeBrick(['go']);
        const assertion = vi.fn();
        await testMultiLanguage(brick, FIXTURES, assertion);
        expect(assertion).not.toHaveBeenCalled();
    });

    it('passes fixture name and language correctly to the assertion', async () => {
        const brick = makeBrick(['typescript']);
        const calls: Array<[string, string]> = [];
        await testMultiLanguage(brick, { 'my-fixture': 'typescript' }, async (name, lang) => {
            calls.push([name, lang]);
        });
        expect(calls).toEqual([['my-fixture', 'typescript']]);
    });
});
