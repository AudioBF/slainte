# Diet Planned Photo Dedup — Plan

**Status:** Planning only. No app code changed.  
**Goal:** Prevent accidental duplicate logging when a planned meal is already registered today but **Fotografar** is still enabled in Dieta.

**Parent:** `docs/private/DIET_DAY_ALIGNMENT_*` (completed)

---

## 1. Objective

Close the remaining gap after Diet Day Alignment: once a today planned meal shows **Registrado ✓**, the user must not be able to start a photo flow that logs the same `plannedMealId` again for today.

Smallest fix. No new flows, no persist shape changes.

---

## 2. Current behavior

### Dieta (`app/(tabs)/diet.tsx`)

Per planned meal card:

| Control | Disabled when |
|---|---|
| **Registrar** | `logged \|\| !canRegisterToday` |
| **Fotografar** | `!canRegisterToday` only |
| Recipe tap | Always enabled if recipe exists |

`logged` = `isPlannedMealLoggedToday(loggedMeals, meal.id)` (today + matching `plannedMealId`).

### Photo flow (`app/(tabs)/meal.tsx`)

- Deep link: `/meal?slot=&name=&plannedId=`
- On confirm: `confirmPhotoMeal(slot, name, { plannedMealId: plannedId })`

### Store (`useAppStore.ts`)

| Action | Duplicate guard for `plannedMealId`? |
|---|---|
| `logPlannedMeal` | Yes — returns `false` if already logged today |
| `confirmPhotoMeal` | **No** — always appends a new `LoggedMeal` |

Result: **Registrar** and **Fotografar** are asymmetric after a meal is logged.

---

## 3. User problem

Smoke test after Diet Day Alignment:

1. User registers a today planned meal via **Registrar** → **Registrado ✓**.
2. **Fotografar** remains tappable on the same card.
3. User completes photo flow → second `LoggedMeal` with the same `plannedMealId` and `date: todayISO()`.

**Impact:**

- Duplicate row in **Refeições de hoje**
- Inflated today macros
- **Cardápio de hoje** progress may look correct (one plan slot) while actual intake is double-counted

---

## 4. Recommended smallest implementation

### Primary (required): `diet.tsx`

Change Fotografar disabled condition from:

```ts
disabled={!canRegisterToday}
```

to:

```ts
disabled={!canRegisterToday || logged}
```

Mirror **Registrar** gating. No copy change required (button already shows disabled state; optional: reuse “Registrado ✓” context — not required for v1).

**Preserves:**

- Today unlogged meals: Fotografar works
- Non-today: still blocked via `!canRegisterToday`
- Recipe tap: unchanged

### Secondary (recommended): store guard in `confirmPhotoMeal`

Add the same duplicate check as `logPlannedMeal` when `options?.plannedMealId` is set:

- If `loggedMeals` already has `date === todayISO()` and matching `plannedMealId` → return early (no new meal).

**Why:** One-line defense for deep links, browser history, or any future caller — not only Dieta UI.

**Not required** if we only ship `diet.tsx`; acceptable for absolute minimum slice.

---

## 5. Whether `meal.tsx` needs a guard

| Approach | Verdict |
|---|---|
| **`diet.tsx` only** | Sufficient for normal in-app path. Smallest diff. |
| **`meal.tsx` guard** | Optional UI-layer check in `handleConfirm` before `confirmPhotoMeal`. Redundant if store guard exists. |
| **`confirmPhotoMeal` store guard** | **Preferred defense-in-depth** over `meal.tsx` — single place, protects deep link without screen-specific logic. |

**Recommendation:** Ship **`diet.tsx` + `confirmPhotoMeal` guard**. Skip `meal.tsx` changes unless we want an early toast (“Refeição já registrada”) before confirm — out of scope for smallest fix.

No new error toast in v1; silent no-op at store level matches `logPlannedMeal` returning `false`.

---

## 6. Files likely to touch

| File | Change |
|---|---|
| `app/(tabs)/diet.tsx` | `disabled={!canRegisterToday \|\| logged}` on Fotografar |
| `src/store/useAppStore.ts` | (Optional) duplicate check in `confirmPhotoMeal` when `plannedMealId` present |

**Not expected:** `meal.tsx`, selectors, types, Home, Shopping, AI, Supabase.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| User wants photo log *instead of* quick register | They can still Fotografar **before** registering; after register, duplicate is intentional block |
| User wants second photo log without plan link | Use Home **+ Nova** / meal tab without `plannedId` — unchanged |
| Store no-op without UI feedback | Same as `logPlannedMeal` false return; Dieta button disabled prevents most cases |
| Legitimate re-log same slot different food | Out of scope — would need “replace” UX, not dedup |

---

## 8. Out of scope

- AI, Supabase, Edge Functions
- Meal plan generation
- Shopping, Auth, onboarding, profile, markets
- Persisted shape changes
- Backfill / register previous day
- New confirmation modals or error toasts
- Disabling Fotografar globally when any meal logged (only **same** `plannedMealId` today)
- Replacing or editing an existing planned log via photo

---

## 9. Acceptance criteria

1. Today planned meal **not** logged: **Registrar** and **Fotografar** both enabled.
2. Today planned meal **logged** via Registrar: **Fotografar** disabled on that card; **Registrar** shows **Registrado ✓**.
3. Non-today Dieta day: **Fotografar** still disabled (existing `canRegisterToday` rule).
4. Recipe tap still works when logged.
5. If store guard shipped: calling `confirmPhotoMeal` with an already-logged `plannedMealId` does not append a second meal.
6. Home **+ Nova** / photo without `plannedId` unchanged.
7. No persist schema change.

---

## 10. Compact smoke test checklist

- [ ] Today, unlogged planned meal → Fotografar opens `/meal` with `plannedId`
- [ ] Register same meal via Registrar → **Registrado ✓**
- [ ] Fotografar on that card is disabled
- [ ] Home shows one entry for that plan slot (not two)
- [ ] Today macros not doubled after attempted duplicate path
- [ ] Non-today day → Fotografar still disabled; hint unchanged
- [ ] Logged meal → recipe tap still opens
- [ ] (If store guard) Manually open `/meal?plannedId=<id>` for already-logged id → confirm does not duplicate

---

*Planning only. No implementation in this step.*
