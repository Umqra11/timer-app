# Kronometre Presence Fix 3 — rooms.subscribe() in /+page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Call `rooms.subscribe()` (and `rooms.dispose()` on destroy) in `/+page.svelte` so the rooms store actually loads from Firestore. Without this, `list = []`, `myRoomsCache = []`, `rooms.hero` stays `null` forever, and `$effect` (Fix 2) has no reactive dep change to fire on. After this fix, `setRoomContext` will finally be called when the user starts the timer on `/+page`.

**Architecture:**
- Single file modify: `mobile/src/routes/+page.svelte` — add `rooms.subscribe()` in `onMount`, `rooms.dispose()` in `onDestroy`.
- `rooms.subscribe()` (rooms.svelte.ts:174-184) calls `fb.subscribeMyRooms((remote) => { myRoomsCache = remote; list = mergeFromFirestore(remote); })` — populates both `myRoomsCache` (needed by `$derived hero`) and `list`.
- `rooms.dispose()` (rooms.svelte.ts:185-191) calls the unsubscribe. Standard cleanup.
- Reactive chain: `rooms.subscribe()` → `myRoomsCache` set → `$derived hero` recomputes → `$effect` re-fires → `setRoomContext` called.

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict.

## Global Constraints

- Svelte 5 runes only
- TypeScript strict — no `any`
- Existing patterns preserved (Fix 1 + Fix 2 already in place)
- Conventional Commits format
- Single file modify

## Why This Is Needed (Reviewer Found This in Fix 2)

- Fix 1: `onMount(() => setRoomContext(...))` — skipped because `rooms.hero` was null at mount
- Fix 2: `$effect(() => { ... setRoomContext(...) })` — re-fires when deps change, but **the deps never change** because no one calls `rooms.subscribe()` from `/+page`
- The `/leaderboard` page calls `rooms.subscribeMyRooms(...)` which has the side effect of populating `myRoomsCache` and `list`. `/+page` calls neither.
- Result: `$effect` runs once at mount with `hero = null`, never re-fires, `setRoomContext` never called, presence stays `idle`.

---

### Task 1: Add rooms.subscribe() / rooms.dispose() to /+page.svelte

**Files:**
- Modify: `mobile/src/routes/+page.svelte` (only)

- [ ] **Step 1: Read current state**

```bash
sed -n '10,18p;60,80p' mobile/src/routes/+page.svelte
```

Verify: `rooms` already imported (Fix 1), `onDestroy` already imported, `$effect` block (Fix 2) and `onDestroy` block (Fix 1) both present.

- [ ] **Step 2: Wrap existing lifecycle in onMount for rooms.subscribe()**

Current state (after Fix 1 + Fix 2):
```typescript
$effect(() => {
    if (!isFirebaseEnabled()) return;
    const hero = rooms.hero;
    const uname = username.current;
    if (hero && uname) {
        timer.setRoomContext({ roomId: hero.id, username: uname });
    }
});

onDestroy(() => {
    timer.setRoomContext(null);
});
```

Add a new `onMount` block BEFORE the `$effect` block (or anywhere in the script, Svelte 5 allows multiple onMount blocks):

```typescript
onMount(() => {
    rooms.subscribe();
});
```

Also add `rooms.dispose()` to the existing `onDestroy` block (chain with existing cleanup):

```typescript
onDestroy(() => {
    timer.setRoomContext(null);
    rooms.dispose();
});
```

The `onMount` import was already removed by Fix 2 (Fix 1 had it, Fix 2 removed it because we used `$effect` instead). Re-add it:

```typescript
import { onMount, onDestroy } from 'svelte';
```

- [ ] **Step 3: Self-review against checklist**

- [ ] `onMount` import re-added (alongside `onDestroy`)
- [ ] `onMount` block calls `rooms.subscribe()`
- [ ] `onDestroy` block calls `timer.setRoomContext(null)` AND `rooms.dispose()`
- [ ] `$effect` block unchanged (Fix 2)
- [ ] No Svelte 4 syntax
- [ ] No `any`
- [ ] Only `/+page.svelte` modified

- [ ] **Step 4: Commit**

```bash
git add mobile/src/routes/+page.svelte
git commit -m "fix(presence): rooms.subscribe() in /+page onMount — populate hero for $effect"
git push  # autonomous per D-049
```

After this, controller will run:
```bash
cd mobile && npm run build && firebase deploy --only hosting
```

(Autonomous per CLAUDE.md D-069.)

- [ ] **Step 5: Patron smoke test**

After deploy:
1. Hard refresh `/` (Cmd+Shift+R)
2. Wait ~2 seconds for Firestore subscribe
3. Click "Başlat" — start timer
4. Wait 10 seconds
5. Firebase Console: `rooms/9679e4b0.../presence/6e5ba162...` should show `status: "running"`, `elapsedMs: ~10000`
6. Navigate to `/leaderboard` — should see pulsing green dot + ticking time + "ŞU AN" label

---

## Self-Review

**Spec coverage:** Task 1 directly addresses the missing `rooms.subscribe()` call. Without it, Fix 2's `$effect` has no reactive source to fire on.

**Type consistency:** `rooms.subscribe(): void` and `rooms.dispose(): void` — both return void, no params. Matches signatures in `mobile/src/lib/stores/rooms.svelte.ts:174, 185`.

**Risk:** `rooms.subscribe()` is idempotent (early-returns if already subscribed, rooms.svelte.ts:175). Calling it on `/+page` while `/leaderboard` also has the store subscribed is safe — both will get the same Firestore updates. `rooms.dispose()` cancels the subscription; if user navigates from `/+page` to `/leaderboard`, `/leaderboard`'s `subscribeMyRooms` re-establishes it. No race or leak.
