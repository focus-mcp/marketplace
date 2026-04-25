/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkConvEncodingHappy } from './scenarios/conv_encoding/happy/invariants.js';
import { check as checkConvFormatHappy } from './scenarios/conv_format/happy/invariants.js';
import { check as checkConvLanguageHappy } from './scenarios/conv_language/happy/invariants.js';
import { check as checkConvUnitsHappy } from './scenarios/conv_units/happy/invariants.js';
import { check as checkConvUnitsIncompatible } from './scenarios/conv_units/incompatible-types/invariants.js';

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

describe('conv_units integration', () => {
    it('happy: 100 MB → KB = 102400', async () => {
        const output = await runTool(brick, 'units', { value: 100, from: 'mb', to: 'kb' });
        assertInvariants('conv_units/happy', checkConvUnitsHappy(output));
    });

    it('adversarial: kb → ms (incompatible types) must throw', async () => {
        let caughtError: unknown;
        try {
            await runTool(brick, 'units', { value: 100, from: 'kb', to: 'ms' });
        } catch (err) {
            caughtError = err;
        }
        assertInvariants('conv_units/incompatible-types', checkConvUnitsIncompatible(caughtError));
    });
});

describe('conv_encoding integration', () => {
    it('happy: base64encode("hello") → "aGVsbG8="', async () => {
        const output = await runTool(brick, 'encoding', {
            text: 'hello',
            operation: 'base64encode',
        });
        assertInvariants('conv_encoding/happy', checkConvEncodingHappy(output));
    });
});

describe('conv_format integration', () => {
    it('happy: JSON {"a":1} → YAML contains "a: 1"', async () => {
        const output = await runTool(brick, 'format', {
            data: '{"a":1}',
            from: 'json',
            to: 'yaml',
        });
        assertInvariants('conv_format/happy', checkConvFormatHappy(output));
    });
});

describe('conv_language integration', () => {
    it('happy: camelCase "myVariableName" → snake_case "my_variable_name"', async () => {
        const output = await runTool(brick, 'language', {
            text: 'myVariableName',
            to: 'snake',
        });
        assertInvariants('conv_language/happy', checkConvLanguageHappy(output));
    });
});
