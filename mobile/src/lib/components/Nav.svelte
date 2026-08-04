<!--
  Nav.svelte — Alt navigasyon (3 sekme)
  Aktif sekme teal vurgulu. Safe area için safe-bottom padding.
-->
<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/', label: 'Kronometre', icon: 'timer' },
		{ href: '/leaderboard', label: 'Liderlik', icon: 'trophy' },
		{ href: '/profile', label: 'Profil', icon: 'user' }
	] as const;

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/80 backdrop-blur-xl safe-bottom"
>
	<ul class="mx-auto flex max-w-md items-stretch justify-around px-2 py-1">
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<li class="flex-1">
				<a
					href={tab.href}
					class="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2.5 transition-colors"
					class:text-accent={active}
					class:text-fg-subtle={!active}
					aria-current={active ? 'page' : undefined}
				>
					<!-- Inline SVG icons (currentColor ile renklenir) -->
					{#if tab.icon === 'timer'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="13" r="8" />
							<path d="M12 9v4l2 2" />
							<path d="M5 3 2 6" />
							<path d="m22 6-3-3" />
							<path d="M9 1h6" />
						</svg>
					{:else if tab.icon === 'trophy'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
							<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
							<path d="M4 22h16" />
							<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
							<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
							<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
						</svg>
					{:else if tab.icon === 'user'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					{/if}
					<span class="text-[11px] font-medium">{tab.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
