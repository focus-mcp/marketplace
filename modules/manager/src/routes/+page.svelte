<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->
<script lang="ts">
// Placeholder: no real connection wiring yet. The admin HTTP API is not shipped by the CLI
// at this stage. This form captures the shape of the future flow (baseUrl + token).
let baseUrl = $state('http://localhost:4311');
let token = $state('');
let status = $state<'idle' | 'pending' | 'ready'>('idle');

function handleConnect(event: SubmitEvent): void {
    event.preventDefault();
    status = 'pending';
    // Deliberately no network call here — wiring lands when @focus-mcp/cli admin API ships.
    status = 'ready';
}
</script>

<section class="space-y-8">
  <div class="space-y-3">
    <h1 class="text-3xl font-semibold tracking-tight text-slate-900">FocusMCP Manager</h1>
    <p class="max-w-2xl text-base text-slate-600">
      Connect this dashboard to your running <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm">@focus-mcp/cli</code>
      to observe live metrics, logs, and the bricks loaded in your orchestrator. The manager is
      <strong>purely observational</strong>: brick install, remove, and configuration all happen in the CLI.
    </p>
  </div>

  <form
    class="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    onsubmit={handleConnect}
  >
    <div class="space-y-1">
      <label for="baseUrl" class="block text-sm font-medium text-slate-700">CLI admin URL</label>
      <input
        id="baseUrl"
        type="url"
        required
        bind:value={baseUrl}
        placeholder="http://localhost:4311"
        class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <p class="text-xs text-slate-500">
        Start your CLI with <code class="rounded bg-slate-100 px-1 py-0.5">focus start --admin-api</code> to expose the API.
      </p>
    </div>

    <div class="space-y-1">
      <label for="token" class="block text-sm font-medium text-slate-700">Admin token</label>
      <input
        id="token"
        type="password"
        required
        bind:value={token}
        autocomplete="off"
        class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <p class="text-xs text-slate-500">The CLI prints a one-off token on boot. Paste it here.</p>
    </div>

    <button
      type="submit"
      class="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      Connect
    </button>

    {#if status === 'ready'}
      <p class="text-sm text-amber-600">
        Connection wiring is not implemented yet — this repository currently ships only the scaffold.
        See the <a class="underline" href="/bricks">Bricks</a> page for the planned views.
      </p>
    {/if}
  </form>
</section>
