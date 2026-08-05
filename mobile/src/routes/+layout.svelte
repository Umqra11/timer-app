<!--
  +layout.svelte — Tüm sayfaları saran layout
  - Auth gate: username yoksa /onboarding'e yönlendir (D-015, D-024)
  - Onboarding sayfası bu kontrolden muaf (yoksa sonsuz döngü)
  - Alt navigasyon onboarding dışında her yerde görünür
  - D-019: Aynı tarayıcıdaki tüm sekmeler aynı timer state'ini paylaşır.
-->
<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import Nav from '$lib/components/Nav.svelte';

	let { children } = $props();

	// D-019: BroadcastChannel — aynı tarayıcıdaki sekmeler arası timer senkronu.
	// Onboarding öncesi bindRemote çağırmaya gerek yok; effect zaten username olunca bir kez bağlanır.
	$effect(() => {
		if (!username.isSet) return;
		return timer.bindRemote();
	});

	// Auth gate effect
	$effect(() => {
		const onOnboarding = page.url.pathname.startsWith('/onboarding');
		if (!onOnboarding && !username.isSet) {
			goto('/onboarding', { replaceState: true });
		}
	});

	const showNav = $derived(username.isSet && !page.url.pathname.startsWith('/onboarding'));
</script>

<svelte:head>
	<title>Timer</title>
</svelte:head>

<!-- Sayfa içeriği — alt navigasyon için alttan boşluk bırak -->
<main class="mx-auto min-h-dvh w-full max-w-md px-5 pt-8" class:pb-24={showNav}>
	{@render children()}
</main>

{#if showNav}
	<Nav />
{/if}
