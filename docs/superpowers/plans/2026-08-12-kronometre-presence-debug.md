# Kronometre Presence Debug Instrumentation — Fix 4

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add strategic `console.log` statements to `/+page.svelte` and `timer.svelte.ts` so we can see exactly which code paths fire (or don't) at runtime. 3 fixes have failed silently — the patron sees `status: "idle"`, no error in console, but presence never updates. Without runtime visibility we're guessing. This task adds observability.

**Architecture:**
- Single file modify: `mobile/src/routes/+page.svelte` — add console.log in onMount, $effect, and at timer.start invocation
- Single file modify: `mobile/src/lib/stores/timer.svelte.ts` — add console.log in `pushToRemote` and `setRoomContext`
- These logs are temporary — they'll be removed once we identify the root cause
- Logs use a `[KronoDebug]` prefix to filter easily

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict.

## Global Constraints

- Svelte 5 idioms only
- TypeScript strict — no `any`
- Logs are temporary debug instrumentation, NOT production code
- Use `console.log` with a clear prefix so they can be filtered
- Single behavior change: nothing functional, just observability

## Why We Need This

- Fix 1 (onMount setRoomContext) — failed, hero null
- Fix 2 ($effect) — failed, no reactive dep change
- Fix 3 (rooms.subscribe()) — failed, still idle, no error
- 10× "errors" in DevTools turned out to be checkbox UI side-effects, not real errors
- Without observability, every future fix is a guess

---

### Task 1: Add debug logs

**Files:**
- Modify: `mobile/src/routes/+page.svelte`
- Modify: `mobile/src/lib/stores/timer.svelte.ts`

- [ ] **Step 1: Add logs in /+page.svelte**

In `/+page.svelte` script section, add these log statements:

```typescript
onMount(() => {
    console.log('[KronoDebug] onMount fired, hero=', rooms.hero, 'uname=', username.current, 'fbEnabled=', isFirebaseEnabled());
    rooms.subscribe();
    console.log('[KronoDebug] after rooms.subscribe(), hero=', rooms.hero);
});

$effect(() => {
    const hero = rooms.hero;
    const uname = username.current;
    const fb = isFirebaseEnabled();
    console.log('[KronoDebug] $effect fired, hero=', hero, 'uname=', uname, 'fbEnabled=', fb);
    if (!fb) return;
    if (hero && uname) {
        console.log('[KronoDebug] setRoomContext calling with', { roomId: hero.id, username: uname });
        timer.setRoomContext({ roomId: hero.id, username: uname });
    }
});

onDestroy(() => {
    console.log('[KronoDebug] onDestroy fired');
    timer.setRoomContext(null);
    rooms.dispose();
});
```

In the `handleStart` function (or wherever timer.start() is called), add:

```typescript
function handleStart() {
    playClick();
    console.log('[KronoDebug] handleStart called');
    timer.start();
    console.log('[KronoDebug] handleStart returned, status=', timer.status);
}
```

- [ ] **Step 2: Add logs in timer.svelte.ts**

In `mobile/src/lib/stores/timer.svelte.ts`:

In `pushToRemote`:
```typescript
function pushToRemote() {
    console.log('[KronoDebug] pushToRemote called, roomCtx=', roomCtx, 'status=', status, 'elapsedMs=', elapsedMs);
    timerBroadcast.send({ type: 'tick', elapsedMs, status });
    if (roomCtx) {
        const ps: presence.PresenceStatus = ...;
        console.log('[KronoDebug] pushToRemote writing presence, status=', ps);
        void presence.writePresence(roomCtx.roomId, roomCtx.username, ps, elapsedMs);
    } else {
        console.log('[KronoDebug] pushToRemote SKIPPED — roomCtx is null');
    }
}
```

In `setRoomContext`:
```typescript
setRoomContext(ctx, onRemote) {
    console.log('[KronoDebug] setRoomContext called, ctx=', ctx);
    roomCtx = ctx;
    // ... existing logic ...
    if (ctx && isFirebaseEnabled()) {
        // existing onRemote subscribe
        if (onRemote) {
            unsubscribePresence = presence.subscribeRoomPresence(ctx.roomId, onRemote);
        }
        console.log('[KronoDebug] setRoomContext writing initial presence (idle)');
        void presence.writePresence(ctx.roomId, ctx.username, 'idle', 0);
    }
    // ... existing lifecycle listener setup
}
```

- [ ] **Step 3: Self-review**

- [ ] /+page.svelte has logs in onMount, $effect, onDestroy, handleStart
- [ ] timer.svelte.ts has logs in pushToRemote and setRoomContext
- [ ] All logs use `[KronoDebug]` prefix
- [ ] No functional changes — just console.log additions
- [ ] No Svelte 4 syntax
- [ ] No `any`

- [ ] **Step 4: Commit + push + build + deploy**

```bash
git add mobile/src/routes/+page.svelte mobile/src/lib/stores/timer.svelte.ts
git commit -m "debug(presence): add [KronoDebug] console.log instrumentation"
git push  # autonomous per D-049
```

Then controller runs:
```bash
cd mobile && npm run build && firebase deploy --only hosting
```

(Autonomous per CLAUDE.md D-069.)

- [ ] **Step 5: Patron collects logs**

After deploy:
1. Hard refresh `https://timerviber.web.app/` (Cmd+Shift+R)
2. F12 → Console → filter "KronoDebug" (or clear first to remove old logs)
3. **Wait 2 seconds** for Firestore subscribe to resolve
4. Click "Başlat" (start timer)
5. Wait 10 seconds
6. Copy ALL `[KronoDebug]` log lines and send to controller

**Expected logs (in order):**
- `[KronoDebug] onMount fired, hero= null uname= Enes fbEnabled= true`
- `[KronoDebug] after rooms.subscribe(), hero= null` (then later hero= Object after Firestore resolves)
- `[KronoDebug] $effect fired, hero= Object uname= Enes fbEnabled= true`
- `[KronoDebug] setRoomContext calling with { roomId: ..., username: Enes }`
- `[KronoDebug] setRoomContext called, ctx= {...}`
- `[KronoDebug] setRoomContext writing initial presence (idle)`
- `[KronoDebug] handleStart called`
- `[KronoDebug] pushToRemote called, roomCtx= {...} status= running elapsedMs= 0`
- `[KronoDebug] pushToRemote writing presence, status= running`

**If any of these are missing, that's the smoking gun.**

---

## Self-Review

**Coverage:** Logs added at every critical boundary — onMount, $effect, onDestroy, setRoomContext, pushToRemote, handleStart. Any failure to call these is now visible.

**Type consistency:** `console.log` accepts any; no type changes.

**Risk:** None — observability only, no functional change.
