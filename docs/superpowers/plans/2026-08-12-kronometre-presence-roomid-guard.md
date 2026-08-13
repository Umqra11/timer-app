# Kronometre Presence Fix 5 — lastRoomId guard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add `lastRoomId` guard in `$effect` so `setRoomContext` is only called when the room actually changes — not on every reactive re-fire. Fix 4 logs revealed `$effect` re-fires whenever `rooms.hero` object reference changes (Firestore snapshots), each calling `setRoomContext` which writes `'idle', 0`, overwriting any `'running'` state.

**Architecture:**
- Single file modify: `mobile/src/routes/+page.svelte` — add `lastRoomId` module-level state in the script section; guard `$effect` body to only call `setRoomContext` when `hero.id !== lastRoomId`.
- Pattern: D-068 plan already documented this as "lastTouchedId" in `/leaderboard` — same pattern reused here.
- Fix 4 debug logs (`[KronoDebug]`) stay in place for now — they help confirm Fix 5 works, will be removed in a follow-up cleanup task.

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict.

## Global Constraints

- Svelte 5 idioms only
- TypeScript strict — no `any`
- Single file modify
- Conventional Commits format

## Root Cause (from Fix 4 evidence)

Patron's console log showed:
```
$effect fired, hero= {...} 
setRoomContext calling with {...}
setRoomContext writing initial presence (idle)   ← overwrites 'running'
... (next snapshot)
$effect fired, hero= {...}   ← new object reference
setRoomContext calling with {...}
setRoomContext writing initial presence (idle)   ← overwrites 'running' again
```

Each Firestore snapshot creates a new `myRoomsCache` array, a new `sorted` derived array, a new `hero` object — even with the same `id`. Svelte 5's `$effect` tracks all reads, so any reference change re-fires the effect. Each re-fire calls `setRoomContext` which unconditionally writes `'idle', 0` via `presence.writePresence(...)` in `timer.svelte.ts:126`.

The fix: skip `setRoomContext` if `hero.id` hasn't changed. Re-fires with the same id are no-ops.

---

### Task 1: Add lastRoomId guard

**Files:**
- Modify: `mobile/src/routes/+page.svelte` (only)

- [ ] **Step 1: Read current state**

```bash
sed -n '14,18p;70,90p' mobile/src/routes/+page.svelte
```

Verify: `onMount` block, `$effect` block (with Fix 2 + Fix 4 logs), `onDestroy` block all present.

- [ ] **Step 2: Add lastRoomId module-level state and guard $effect**

In the script section, add near the top of the script (after imports, before the existing `display = $derived(...)` block):

```typescript
let lastRoomId: string | null = null;
```

Then replace the existing `$effect` block body (the one that calls `setRoomContext`) with the guarded version:

```typescript
$effect(() => {
    const hero = rooms.hero;
    const uname = username.current;
    const fb = isFirebaseEnabled();
    console.log('[KronoDebug] $effect fired, hero=', hero, 'uname=', uname, 'fbEnabled=', fb, 'lastRoomId=', lastRoomId);
    if (!fb) return;
    if (hero && uname && hero.id !== lastRoomId) {
        lastRoomId = hero.id;
        console.log('[KronoDebug] setRoomContext calling with', { roomId: hero.id, username: uname });
        timer.setRoomContext({ roomId: hero.id, username: uname });
    } else {
        console.log('[KronoDebug] $effect SKIPPED — same room or missing data');
    }
});
```

- [ ] **Step 3: Self-review against checklist**

- [ ] `lastRoomId: string | null = null;` declared at module level (inside script, outside any function/closure)
- [ ] `$effect` body includes `hero.id !== lastRoomId` guard
- [ ] When same id, no `setRoomContext` call (idempotent re-fire)
- [ ] Fix 4 logs preserved (helps confirm Fix 5 works in browser)
- [ ] No Svelte 4 syntax
- [ ] No `any`
- [ ] Only `/+page.svelte` modified

- [ ] **Step 4: Commit + push**

```bash
git add mobile/src/routes/+page.svelte
git commit -m "fix(presence): lastRoomId guard in \$effect — avoid idle override on snapshot re-fire"
git push  # autonomous per D-049
```

After commit, controller runs `npm run build && firebase deploy --only hosting` (autonomous per D-069).

- [ ] **Step 5: Patron smoke test**

After deploy:
1. Hard refresh `https://timerviber.web.app/` (Cmd+Shift+R)
2. F12 → Console → filter `KronoDebug` → clear old logs
3. Wait 2 seconds for Firestore subscribe
4. Click "Başlat" — start timer
5. Wait 10 seconds
6. Check Firebase Console: `rooms/9679e4b0.../presence/6e5ba162...` should now show:
   - `status: "running"` ✅
   - `elapsedMs: ~10000`
   - `updatedAt: 1-2 seconds ago`
7. Navigate to `/leaderboard` — should see pulsing green dot + ticking time + "ŞU AN" label
8. Console log expectation: `[KronoDebug] $effect fired, hero=... uname=Enes lastRoomId=null` once → setRoomContext → then `$effect fired, hero=... lastRoomId=9679e4b0...` (no setRoomContext call) on subsequent re-fires

---

## Self-Review

**Spec coverage:** Task 1 directly addresses the override problem. lastRoomId guard skips setRoomContext when same room.

**Type consistency:** `lastRoomId: string | null`, `hero.id: string` — comparison valid.

**Risk:** If user switches rooms (`hero.id` changes), `setRoomContext(null)` (from cleanup) and new `setRoomContext({...})` run correctly. If user logs out and back in with same room, no issue. If user leaves the only room and joins a new one, the id change triggers re-init.
