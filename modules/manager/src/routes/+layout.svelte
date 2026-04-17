<!--
SPDX-FileCopyrightText: 2026 FocusMCP contributors
SPDX-License-Identifier: MIT
-->
<script lang="ts">
import '../app.css';
import { page } from '$app/state';

interface NavLink {
    href: string;
    label: string;
}

const links: readonly NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/bricks', label: 'Bricks' },
    { href: '/logs', label: 'Logs' },
    { href: '/metrics', label: 'Metrics' },
    { href: '/graph', label: 'Graph' },
];

let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
  <header class="border-b border-slate-200 bg-white shadow-sm">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <a href="/" class="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span aria-hidden="true" class="inline-block h-3 w-3 rounded-full bg-emerald-500"></span>
        FocusMCP Manager
      </a>
      <nav aria-label="Primary">
        <ul class="flex items-center gap-1">
          {#each links as link (link.href)}
            {@const active = page.url.pathname === link.href}
            <li>
              <a
                href={link.href}
                class="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-slate-100 {active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600'}"
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  </header>

  <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
    {@render children()}
  </main>

  <footer class="border-t border-slate-200 bg-white">
    <div class="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-500">
      FocusMCP Manager — optional dashboard. Brick management stays in the CLI.
    </div>
  </footer>
</div>
