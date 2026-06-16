# Meal Review Sticky Footer Polish — Result

**Status:** Implemented. Not committed in this doc step.  
**Plan:** `docs/private/MEAL_REVIEW_STICKY_FOOTER_POLISH_PLAN.md`  
**Scope:** Revisar-step layout polish only — no AI, store, or business logic changes.

---

## Summary

Polished the **Revisar** step of the meal photo flow so **Registrar no dia** stays usable via the existing `PrimaryActionBar`, with documented scroll clearance and lightweight iOS keyboard avoidance. Foto and Análise steps unchanged.

---

## Files changed

| File | Change |
|---|---|
| `app/(tabs)/meal.tsx` | Named footer constants, `KeyboardAvoidingView` on Revisar |
| `docs/private/MEAL_REVIEW_STICKY_FOOTER_POLISH_RESULT.md` | This document |

**Only code file:** `app/(tabs)/meal.tsx`

---

## What changed

### Named footer spacing (replaces `88 + 64`)

| Constant | Value | Purpose |
|---|---|---|
| `REVIEW_PRIMARY_ACTION_HEIGHT` | `spacing.md + 44 + spacing.md` (68px) | Bar padding + button height |
| `TAB_BAR_OFFSET` | `64` | Matches `PrimaryActionBar` `aboveTabBar` |
| `REVIEW_FOOTER_SPACE` | `68 + 64 + spacing.xl` (152px) | Scroll bottom clearance; equivalent to prior magic sum |

Safe-area bottom inset is **not** included in `REVIEW_FOOTER_SPACE` — `PrimaryActionBar` applies `useSafeAreaInsets()` on the bar itself.

### KeyboardAvoidingView (Revisar only)

Wraps the screen when `photoDraft` is set (`isReviewStep`).

| Platform | Behavior |
|---|---|
| **iOS** | `behavior="padding"`, `enabled={true}`, `keyboardVerticalOffset={TAB_BAR_OFFSET}` |
| **Android / web** | Disabled — avoids layout regression on non-iOS |

---

## Preserved behavior

- `PrimaryActionBar` label **Registrar no dia**
- `aboveTabBar`
- `handleConfirm` → `confirmPhotoMeal` → navigate to Hoje
- Component weight editing and macro recalculation
- Add item flow
- Slot `ChipGroup` (**Registrar como**)
- Foto / Análise step layout (no sticky footer on those steps)

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed

---

## Explicit non-changes

| Area | Status |
|---|---|
| AI / prompts | No change |
| Supabase / Edge Functions | No change |
| Zustand store | No change |
| `photoDraft` shape | No change |
| `LoggedMeal` shape | No change |
| Macro recalculation | No change |
| Home / Dieta / Compras / Mercados / Auth / onboarding / profile | No change |
| `PrimaryActionBar` / `Screen` shared components | No change |

---

## Known caveat

- **Android / PWA:** keyboard may still require manual scroll near the footer (KeyboardAvoidingView disabled).
- **Safe area:** not double-counted in scroll padding; bar handles device inset.

---

## Next recommended slice

**Meal plan Edge rollout** — only when Gemini quota is stable. Optional: Shopping 3C+, Sprint 2D+ trend alignment, toast/haptics.

---

*Result doc only. No app code changed in this step.*
