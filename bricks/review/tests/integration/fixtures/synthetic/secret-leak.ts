// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// Synthetic fixture — intentionally contains fake secrets for security review tests.
// DO NOT use any of these values in real code.

export const apiKey = 'sk_test_xxx1234567890abcdef'; // gitleaks:allow

export function getConfig() {
    return {
        endpoint: 'https://api.example.com',
        apiKey,
    };
}
