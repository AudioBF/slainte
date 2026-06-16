# Diet Planned Photo Dedup — Result

**Status:** Completed.  
**Plan:** `docs/private/DIET_PLANNED_PHOTO_DEDUP_PLAN.md`  
**Commit:** `b2b61c8` — `fix(diet): prevent duplicate photo log for planned meals`

---

## Problem solved

After Diet Day Alignment, **Registrar** was disabled when a planned meal was already logged today, but **Fotografar** remained enabled. Users could complete the photo flow with `plannedId` and create a duplicate `LoggedMeal` for the same plan slot — inflating today’s macros while **Cardápio de hoje** still showed 4/4.

---

## Business rule

> **One `plannedMealId` can only be logged once per day.**

Enforced in the store (`confirmPhotoMeal`, alongside existing `logPlannedMeal` guard). UI in Dieta mirrors the rule; recipe view stays available after registration.

---

## Files changed

| File | Change |
|---|---|
| `app/(tabs)/diet.tsx` | `Fotografar` disabled when `!canRegisterToday \|\| logged` |
| `src/store/useAppStore.ts` | `confirmPhotoMeal` early-return if `plannedMealId` already logged today |

**Not changed:** `meal.tsx` (store owns the rule).

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed

---

## Visual validation (screenshots)

| Check | Result |
|---|---|
| Cardápio de hoje vs Refeições de hoje | Aligned — 4/4 planned meals registered and listed |
| Registrado ✓ + recipe | Recipe still tappable; ingredients/preparation accessible |
| Fotografar after register | Disabled on logged cards |
| Plano × Real (Semana) | Week macro comparison readable and useful |

No functional issues observed in smoke test. **No pending code changes** for this slice.

---

## Explicit non-changes

| Area | Status |
|---|---|
| AI / Supabase / Edge Functions | No change |
| Meal plan generation / Shopping / Auth | No change |
| Persisted data shape | No change |
| `meal.tsx` | No change |

---

## Backlog polish (future, not blocking)

1. **Stronger disabled state for Fotografar** — lower opacity / muted background so disabled matches **Registrado ✓** visually.
2. **`kcal` suffix in weekly history totals** — e.g. `4324 kcal` / `775 kcal` on Hoje/Ontem rows.
3. **Percentage labels in Plano × Real** — e.g. `90%` beside Plano/Real macro pairs for instant scan.
