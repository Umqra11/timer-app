# Remove [KronoDebug] Debug Logs — Fix 6

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Remove all `[KronoDebug]` `console.log` instrumentation added by Fix 4. These were temporary debug logs that helped identify the root cause of Fix 1-5 chain (snapshot re-fire override). Now that Fix 5 (lastRoomId guard) is in place, the logs are no longer needed and would leak into production.

**Architecture:**
- Two files modify: `mobile/src/routes/+page.svelte` and `mobile/src/lib/stores/timer.svelte.ts`
- Remove ALL `console.log('[KronoDebug]...')` lines
- Keep Fix 5's `lastRoomId` module-level state and the guard condition in `$effect` body
- No functional change — pure cleanup

**Tech Stack:** SvelteKit + Svelte 5 runes + TypeScript strict.

## Global Constraints

- Svelte 5 idioms only
- TypeScript strict — no `any`
- Conventional Commits format
- Two files modify only
- DO NOT remove Fix 5's `lastRoomId` variable or the guard condition — only the `console.log` lines
- DO NOT remove any non-log code (Fix 1-3 fixes, Fix 5 guard)

## Why This Cleanup Matters

- Fix 4 logs were added 2026-08-11 for debugging. Root cause identified (`$effect` re-fire on Firestore snapshots). Fix 5 added the actual guard. Logs are now obsolete.
- Production logs pollute browser console for end users
- Each log fires on every state change — performance cost
- Sprint-05 Faz 1.5 parked per patron decision (2026-08-12) — but production should still not ship debug code

---

### Task 1: Remove all [KronoDebug] console.log statements

**Files:**
- Modify: `mobile/src/routes/+page.svelte` (multiple log lines)
- Modify: `mobile/src/lib/stores/timer.svelte.ts` (multiple log lines)

- [ ] **Step 1: Read current state of both files**

```bash
grep -n "KronoDebug" mobile/src/routes/+page.svelte mobile/src/lib/stores/timer.svelte.ts
```

Verify: list all log lines so you know what to remove.

- [ ] **Step 2: Remove logs in /+page.svelte**

Logs to remove (approximately, verify against the grep output):
- `console.log('[KronoDebug] onMount fired, ...')`
- `console.log('[KronoDebug] after rooms.subscribe(), ...')`
- `console.log('[KronoDebug] $effect fired, ...')` (in $effect)
- `console.log('[KronoDebug] setRoomContext calling with ...')`
- `console.log('[KronoDebug] $effect SKIPPED — same room or missing data')` (in $effect else branch)
- `console.log('[KronoDebug] onDestroy fired')`
- `console.log('[KronoDebug] handleStart called')`
- `console.log('[KronoDebug] handleStart returned, ...')`

**KEEP:** `let lastRoomId: string | null = null;` and the `if (hero && uname && hero.id !== lastRoomId) { ... }` guard structure.

- [ ] **Step 3: Remove logs in timer.svelte.ts**

Logs to remove:
- `console.log('[KronoDebug] pushToRemote called, ...')`
- `console.log('[KronoDebug] pushToRemote writing presence, ...')` (and the if/else branch with SKIPPED)
- `console.log('[KronoDebug] setRoomContext called, ...')`
- `console.log('[KronoDebug] setRoomContext writing initial presence (idle)')`

**KEEP:** All non-log code — `setRoomContext` body, `pushToRemote` body, lifecycle listener setup, etc.

- [ ] **Step 4: Self-review against checklist**

- [ ] No `[KronoDebug]` strings remain in either file (verify with grep)
- [ ] `lastRoomId` variable and guard condition preserved in /+page.svelte
- [ ] onMount `rooms.subscribe()` call preserved
- [ ] onDestroy `setRoomContext(null)` + `rooms.dispose()` preserved
- [ ] `setRoomContext` and `pushToRemote` function bodies preserved (only console.log lines removed)
- [ ] No Svelte 4 syntax introduced
- [ ] No `any`
- [ ] Only two files modified

- [ ] **Step 5: Verify with grep**

```bash
grep -rn "KronoDebug" mobile/src/
```

Expected: no output (no matches).

- [ ] **Step 6: Commit + push**

```bash
git add mobile/src/routes/+page.svelte mobile/src/lib/stores/timer.svelte.ts
git commit -m "chore(presence): remove [KronoDebug] debug logs (Fix 4 cleanup)"
git push  # autonomous per D-049
```

After commit, controller runs `npm run build && firebase deploy --only hosting` (autonomous per D-069).

- [ ] **Step 7: Patron verification**

After deploy:
1. Hard refresh `https://timerviber.web.app/`
2. F12 → Console
3. Console should be clean (no `[KronoDebug]` messages when interacting with /+page or /leaderboard)
4. Presence doc still shows whatever the latest write was — no behavior change

---

## Self-Review

**Spec coverage:** Task 1 directly removes all [KronoDebug] log statements. Fix 5 guard preserved. No functional change.

**Type consistency:** No type changes — pure string/log removal.

**Risk:** None — observability removal, no behavior change.
