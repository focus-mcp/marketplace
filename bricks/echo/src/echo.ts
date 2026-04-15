// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export interface EchoInput {
  readonly message: string;
}

export interface EchoOutput {
  readonly message: string;
}

/** Pure function: returns the message as-is. Extracted for direct testability. */
export function echo(input: EchoInput): EchoOutput {
  return { message: input.message };
}
