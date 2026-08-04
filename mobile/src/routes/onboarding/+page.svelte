<!--
  Onboarding — İlk kez giren kullanıcı için username seçimi
  D-015, D-016, D-024
  - Username girilir, localStorage'a yazılır
  - Direkt ana ekrana (/) yönlendirilir
  - D-016 unique kontrolü: Firestore eklendiğinde server-side kontrol yapılacak
    (şimdilik sadece client-side, MVP için yeterli)
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { username } from '$lib/stores/username.svelte';

	let inputValue = $state('');
	let error = $state<string | null>(null);
	let saving = $state(false);

	function validate(value: string): string | null {
		const trimmed = value.trim();
		if (trimmed.length < 2) return 'En az 2 karakter olmalı';
		if (trimmed.length > 20) return 'En fazla 20 karakter olabilir';
		if (!/^[a-zA-Z0-9_ğüşöçıİĞÜŞÖÇ]+$/.test(trimmed))
			return 'Sadece harf, rakam ve alt çizgi kullanabilirsin';
		return null;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = validate(inputValue);
		if (error) return;

		saving = true;
		const ok = username.set(inputValue);
		saving = false;

		if (ok) {
			goto('/', { replaceState: true });
		} else {
			error = 'Kaydedilemedi, tekrar dene';
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
