<!--
  Liderlik sayfası — placeholder (Sprint-03'te doldurulacak)
  D-033: Ortanca sekme Liderlik
  D-037: Rozetler ileride (MVP'de placeholder)
-->
<script lang="ts">
	import { username } from '$lib/stores/username.svelte';
</script>

<div class="space-y-6 pt-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Liderlik</h1>
		<p class="text-sm text-fg-muted">Bu hafta en çok çalışanlar</p>
	</header>

	<div
		class="rounded-3xl border border-dashed border-border bg-surface p-8 text-center"
	>
		<div
			class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"
		>
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
				class="text-accent"
			>
				<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
				<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
				<path d="M4 22h16" />
				<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
				<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
				<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
			</svg>
		</div>
		<p class="text-fg">Henüz sıralama yok</p>
		<p class="mt-1 text-sm text-fg-muted">
			Hoş geldin {username.current}. Sprint-03'te bu haftanın ve tüm zamanların sıralaması burada
			görünecek.
		</p>
	</div>
</div>
