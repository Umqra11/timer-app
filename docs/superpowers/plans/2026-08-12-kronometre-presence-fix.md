# Kronometre Presence Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix presence write in Kronometre (`/`) page so timer state syncs to leaderboard in real-time. Add `setRoomContext` call in `/+page.svelte` mount so `pushToRemote` can write `presence.status: "running"` to Firestore.

**Architecture:**
- Single file modify: `mobile/src/routes/+page.svelte` — add `onMount` that calls `timer.setRoomContext({ roomId: hero.id, username })` from `rooms.hero` + `username.current`; add `onDestroy` cleanup.
- No schema changes. No new dependencies. No rules changes.
- Touches only `/+page.svelte` (Kronometre main page).
- Idempotent: if user came from `/leaderboard` (where setRoomContext is already called), re-calling is safe.

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict + existing imports.

## Global Constraints

- Svelte 5 runes only — `$state`, `$derived`, `$effect` (no `onMount` → `$effect` if possible, but onMount is fine for one-shot side effects; both are Svelte 5 idioms)
- TypeScript strict — no `any`
- Existing patterns preserved
- Conventional Commits format
- TDD: write failing test first if meaningful (this is a one-shot side effect; manual smoke test is the verification path per Task 1-6 precedent)
- D-062 + D-067 rules already deployed (sessions + joinedRooms delete)

## Why This Bug Exists (Root Cause)

Per `mobile/src/lib/stores/timer.svelte.ts:44-51`, `pushToRemote` only writes to Firestore presence **if `roomCtx` is set**. `setRoomContext` is only called from `mobile/src/routes/leaderboard/+page.svelte:116-118`. The Kronometre page (`routes/+page.svelte`) never calls `setRoomContext`, so `roomCtx` stays `null` and `pushToRemote` is a no-op when timer starts/pauses/stops. User sees "🟢 Çalışıyorsun" on the local page (driven by client-local `timer.status`), but the Firestore `presence` doc never updates, so `/leaderboard` never sees them as running.

**Evidence trail** (from this session):
- Patron tested with UID `6e5ba162-6b40-4343-9bff-c7fe68e90a1c`
- Timer running on `/` (Kronometre) page, "Çalışıyorsun" visible
- Firestore `rooms/9679e4b0-c448-411a-a81f-04f.../presence/6e5ba162...` shows `status: "idle"`, `elapsedMs: 0`
- `grep -n "setRoomContext\|writePresence" mobile/src/routes/+page.svelte mobile/src/routes/+layout.svelte` returns empty
- Console clean (no errors) — confirms not a network issue, just no write happening

---

### Task 1: Add setRoomContext to /+page.svelte

**Files:**
- Modify: `mobile/src/routes/+page.svelte` (only this file)

**Interfaces:**
- `rooms.hero: Room | null` — last-joined or newest room (from `$lib/stores/rooms.svelte`)
- `username.current: string | null` — current username
- `timer.setRoomContext(ctx: { roomId: string; username: string } | null): void` — sets roomCtx module-level
- `isFirebaseEnabled(): boolean` — from `$lib/firebase/client`

- [ ] **Step 1: Read existing imports and onMount pattern in /+page.svelte**

```bash
# Verify current state
head -30 mobile/src/routes/+page.svelte
grep -n "onMount\|onDestroy\|setRoomContext" mobile/src/routes/+page.svelte
```

Expected: no `onMount`/`onDestroy`/`setRoomContext` references in `/+page.svelte`.

- [ ] **Step 2: Add imports**

In `mobile/src/routes/+page.svelte` script block, add to existing imports:

```typescript
import { onMount, onDestroy } from 'svelte';
import { isFirebaseEnabled } from '$lib/firebase/client';
import { rooms } from '$lib/stores/rooms.svelte';
```

(Existing imports include `username`, `timer`, `formatHMS`, `playClick` — leave those untouched.)

- [ ] **Step 3: Add onMount + onDestroy after existing script logic**

After the existing `function handleStop() { ... }` block (or after the last `$derived` / `$state` declaration — place where the file's existing structure has script-level side effects), add:

```svelte
onMount(() => {
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

- [ ] **Step 4: Self-review against the brief checklist**

- [ ] imports added: onMount, onDestroy, isFirebaseEnabled, rooms
- [ ] onMount body: isFirebaseEnabled guard + null check on hero + uname + setRoomContext call
- [ ] onDestroy body: setRoomContext(null) for cleanup
- [ ] No Svelte 4 syntax (no `export let`, no `$:`)
- [ ] No `any`
- [ ] File structure: existing imports kept, additions at end of script block

- [ ] **Step 5: Browser smoke test — patron verifies**

After hosting deploy (patron's job, `npm run build` + `npx firebase-tools deploy --only hosting`):
1. Patron hard-refreshes `/` (Brave, Cmd+Shift+R)
2. Patron starts timer, runs for 10+ seconds
3. Patron checks Firebase Console: `rooms/{roomId}/presence/{patronUid}` should show:
   - `status: "running"`
   - `elapsedMs: <some non-zero value>`
   - `updatedAt: <1-2 seconds ago>`
4. Patron navigates to `/leaderboard` — should now see:
   - Pulsing green dot next to their own username
   - "ŞU AN" label
   - Live-ticking time
5. Patron stops timer — `status` should change to `finished`

- [ ] **Step 6: Commit**

```bash
git add mobile/src/routes/+page.svelte
git commit -m "fix(presence): setRoomContext in /+page.svelte mount — timer state syncs to leaderboard"
```

(Autonomous push per D-049: `git push` after commit if patron has not pushed manually.)

---

## Self-Review

**Spec coverage:** This plan addresses the single bug identified in the patron testing session: presence write missing from Kronometre page. Task 1 directly implements the fix.

**Placeholder scan:** No TBD / "implement later" / "add appropriate error handling" placeholders. Step 3 has the exact code to add.

**Type consistency:**
- `rooms.hero: Room | null` — null check is required (no hero = user never joined a room)
- `username.current: string | null` — null check required
- `setRoomContext` signature: `{ roomId: string; username: string } | null` — matches existing timer.svelte.ts:21

**Risk note:**
- If patron has not joined a room yet (`rooms.hero === null`), the fix is a no-op — correct behavior, presence write would fail anyway because there's no room to write to.
- `onDestroy` calls `setRoomContext(null)` — if user navigates from `/` to `/leaderboard`, the `$effect` in `/leaderboard` re-establishes the context (idempotent). No double-cleanup issue.
- The fix is local to the page lifecycle. No global state pollution.
