# Kronometre Presence Fix 2 — onMount → $effect

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Replace `onMount` with `$effect` in `/+page.svelte` so `setRoomContext` is called reactively after `rooms.hero` resolves from async Firestore subscribe. Fix 1 used `onMount` which only runs once at mount time — but `rooms.hero` is `null` at mount (Firestore subscribe resolves later), so `if (hero && uname)` was false, `setRoomContext` was never called, and presence never updated to `running`.

**Architecture:**
- Single file modify: `mobile/src/routes/+page.svelte` — replace `onMount` with `$effect`.
- `$effect` runs once at mount AND re-runs when any reactive dependency (`rooms.hero`, `username.current`, `isFirebaseEnabled()`) changes. So when Firestore's `subscribeMyRooms` callback fires and updates `myRoomsCache` → `sorted` → `hero`, the effect re-runs and `setRoomContext` finally fires.
- `onDestroy` cleanup unchanged.
- Same Svelte 5 idioms as the rest of the codebase (`$effect` is the canonical reactive-on-mount pattern in Svelte 5).

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict.

## Global Constraints

- Svelte 5 runes only — `$state`, `$derived`, `$effect` (no `onMount` → `$effect` is the Svelte 5 idiom for reactive side effects)
- TypeScript strict — no `any`
- Existing patterns preserved
- Conventional Commits format
- Single file modify only

## Why Fix 1 Was Wrong

- `onMount` (Svelte 5) only runs once when the component mounts.
- `rooms.hero` is a `$derived` value that depends on `myRoomsCache`, which is populated asynchronously by `fb.subscribeMyRooms(...)` in the rooms store.
- At mount time: `myRoomsCache = []` (initial empty), so `hero = null`, `if (hero && uname)` is false, `setRoomContext` is skipped.
- When Firestore's first snapshot arrives (~100ms later), `myRoomsCache` updates, `hero` becomes the room — but `onMount` does NOT re-run.
- Result: `setRoomContext` is never called in practice; presence stays `idle`.
- `$effect` (Svelte 5) tracks reactive deps and re-runs when they change, fixing this.

**Evidence from session**:
- Patron hard-refreshed, localStorage showed `hero`, `uid`, `username` all set
- Yet `status: "idle"`, `elapsedMs: 0`
- `updatedAt` reflects only the auto-writePresence('idle', 0) from `setRoomContext` line 126 of timer.svelte.ts (the "idempotent" call when the function is invoked), but actually this only happens IF setRoomContext is called — and it never is, so the write is from /leaderboard's earlier mount still cached

---

### Task 1: Replace onMount with $effect

**Files:**
- Modify: `mobile/src/routes/+page.svelte` (single file)

**Interfaces:** Same as Fix 1 (rooms.hero, username.current, isFirebaseEnabled, timer.setRoomContext).

- [ ] **Step 1: Read current state of /+page.svelte**

```bash
sed -n '14,16p;65,80p' mobile/src/routes/+page.svelte
```

Verify: `onMount` and `onDestroy` are present; `onMount` body has the `if (!isFirebaseEnabled()) return; const hero = rooms.hero; ...` block.

- [ ] **Step 2: Replace `onMount` import with `$effect` (keep onDestroy)**

In the imports block, change:
```typescript
import { onMount, onDestroy } from 'svelte';
```
to:
```typescript
import { onDestroy } from 'svelte';
import { rooms } from '$lib/stores/rooms.svelte';
import { isFirebaseEnabled } from '$lib/firebase/client';
// (rooms and isFirebaseEnabled were already added in Fix 1 — verify they're present; add if missing)
```

Then in the script, find the existing `onMount(() => { ... })` block and replace it with:

```typescript
$effect(() => {
    if (!isFirebaseEnabled()) return;
    const hero = rooms.hero;
    const uname = username.current;
    if (hero && uname) {
        timer.setRoomContext({ roomId: hero.id, username: uname });
    }
});
```

Keep the `onDestroy(() => { timer.setRoomContext(null); });` block unchanged.

- [ ] **Step 3: Self-review against the brief checklist**

- [ ] `onMount` import removed; `onDestroy` import preserved
- [ ] Body uses `$effect(...)` not `onMount(...)`
- [ ] Reactive deps `rooms.hero`, `username.current`, `isFirebaseEnabled()` all read inside the effect (Svelte 5 tracks them automatically)
- [ ] Guard chain unchanged: `isFirebaseEnabled()` → null check hero+uname → setRoomContext
- [ ] onDestroy cleanup preserved (`setRoomContext(null)`)
- [ ] No Svelte 4 syntax
- [ ] No `any`

- [ ] **Step 4: Browser smoke test — patron verifies (after deploy)**

After patron runs `npm run build` + `firebase deploy --only hosting` (autonomous per CLAUDE.md D-069):
1. Patron hard-refreshes `/` (Cmd+Shift+R)
2. Waits ~2 seconds for Firestore subscribe to resolve
3. Starts timer (Başlat button)
4. Waits 10 seconds
5. Firebase Console: `rooms/9679e4b0.../presence/6e5ba162...` should show `status: "running"`, `elapsedMs: ~10000`, `updatedAt: recent`
6. Navigates to /leaderboard — should see pulsing green dot + ticking time + "ŞU AN" label

- [ ] **Step 5: Commit**

```bash
git add mobile/src/routes/+page.svelte
git commit -m "fix(presence): use \$effect instead of onMount for setRoomContext — react to async hero load"
git push  # autonomous per D-049
```

(After this, build + deploy happens via autonomous CLAUDE.md D-069 — `npm run build && firebase deploy --only hosting`.)

---

## Self-Review

**Spec coverage:** Task 1 directly addresses Fix 1's root cause (mount-time non-reactive). $effect is the correct Svelte 5 pattern.

**Placeholder scan:** No TBD / "implement later". Step 2 has the exact code.

**Type consistency:** Same as Fix 1 — `rooms.hero: Room | null`, `username.current: string | null`, after `if (hero && uname)` both narrowed to non-null.

**Risk:**
- `$effect` runs on every reactive change — could re-fire if `rooms.hero` changes (e.g., user switches rooms). `setRoomContext` is idempotent (sets module-level state), so re-firing is safe.
- No new failure modes introduced.
