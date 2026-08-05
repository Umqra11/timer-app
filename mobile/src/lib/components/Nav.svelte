<!--
  Nav.svelte — Alt navigasyon (3 sekme)
  Aktif sekme teal vurgulu. Safe area için safe-bottom padding.

  Sekmeler:
    - Kronometre   → /
    - Odalar       → /rooms       (D-013 hero layout, D-014 last-joined hero)
    - Profil       → /profile
-->
<script lang="ts">
	import { page } from '$app/state';

	type Tab = {
		href: string;
		label: string;
		icon: 'timer' | 'rooms' | 'user';
	};

	const tabs: Tab[] = [
		{ href: '/', label: 'Kronometre', icon: 'timer' },
		{ href: '/rooms', label: 'Odalar', icon: 'rooms' },
		{ href: '/profile', label: 'Profil', icon: 'user' }
	];

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
							aria-hidden="true"
						>
							<circle cx="12" cy="13" r="8" />
							<path d="M12 9v4l2 2" />
							<path d="M5 3 2 6" />
							<path d="m22 6-3-3" />
							<path d="M9 1h6" />
						</svg>
					{:else if tab.icon === 'rooms'}
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
							aria-hidden="true"
						>
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					{:else}
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
							aria-hidden="true"
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
