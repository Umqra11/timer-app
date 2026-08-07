<!--
  Onboarding — İlk kez giren kullanıcı için username seçimi
  D-015, D-016, D-024
  - Username Firestore'da atomik claim edilir (D-016 server-side unique).
  - Çakışma varsa kullanıcıya hata gösterilir, tekrar denemesi istenir.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { username } from '$lib/stores/username.svelte';

	let inputValue = $state('');
	let error = $state<string | null>(null);
	let saving = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (saving) return;
		error = null;
		saving = true;
		const outcome = await username.claim(inputValue);
		saving = false;

		if (outcome === 'ok') {
			goto('/', { replaceState: true });
		} else if (outcome === 'taken') {
			error = 'Bu kullanıcı adı çoktan alınmış — başka bir tane dene';
		} else if (outcome === 'invalid') {
			error = '2-20 karakter, harf/rakam/alt çizgi kullanabilirsin';
		} else {
			error = 'Şu an kaydedilemedi, internetini kontrol et ve tekrar dene';
		}
	}
</script>

<div class="flex min-h-[80dvh] flex-col justify-center">
	<div class="space-y-8">
		<!-- Başlık -->
		<div class="space-y-2">
			<h1 class="text-3xl font-semibold tracking-tight">Timer'a hoş geldin</h1>
			<p class="text-fg-muted">
				Arkadaşlarınla birlikte çalışmak için bir kullanıcı adı seç. Sonra bir daha sormayacağız.
			</p>
		</div>

		<!-- Form -->
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<label for="username" class="text-sm font-medium text-fg-muted">Kullanıcı adı</label>
				<input
					id="username"
					type="text"
					bind:value={inputValue}
					placeholder="ör. enes42"
					autocomplete="username"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					disabled={saving}
					class="w-full rounded-2xl border border-border bg-surface px-5 py-4 text-lg text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
				/>
				{#if error}
					<p class="text-sm text-red-400">{error}</p>
				{:else}
					<p class="text-xs text-fg-subtle">2-20 karakter, harf/rakam/alt çizgi</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={saving}
				class="w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
			>
				{saving ? 'Kaydediliyor...' : 'Devam et'}
			</button>
		</form>
	</div>
</div>
