# Toast + Haptic Feedback — Plan

**Status:** Planning only. No app code changed.  
**Goal:** Add lightweight feedback on key actions so the app feels responsive without changing business logic, data shape, or backend flows.

---

## 1. Objective

Improve perceived responsiveness after important user actions by introducing a small feedback layer:

- **Haptics** on mobile-native interactions
- **Toast (or equivalent transient message)** for success/error confirmations that are currently silent

Keep implementation minimal and local to existing screens/handlers.

---

## 2. Current behavior

### Existing feedback today

| Area | Current feedback |
|---|---|
| `src/lib/haptics.ts` | `hapticLight()` and `hapticSuccess()` exist; web is no-op |
| `shopping.tsx` | `hapticLight()` on item toggle only |
| `meal.tsx` | No explicit haptic on successful register |
| `diet.tsx` | No explicit haptic on planned meal register or plan generation success |
| Generate actions (diet/shopping) | Loading skeleton + inline error text when failure occurs |
| Success paths | Mostly implicit (UI updates/navigation) without explicit confirmation |

### Action coverage gap

- **Meal registered successfully**: navigates back, but no success cue.
- **Planned meal registered**: button state flips, but no micro-confirmation.
- **Shopping generated**: list updates, but no explicit success feedback.
- **Meal plan generated**: content appears, but no explicit success cue.

---

## 3. UX problem

| Problem | User impact |
|---|---|
| Silent success on async actions | Feels laggy/uncertain (“foi mesmo?”) |
| Inconsistent feedback patterns | Some actions vibrate, others do nothing |
| Web/PWA has no haptics | Needs visual fallback for parity |
| Errors depend on inline text | Easy to miss when user scrolls |

Need a tiny, consistent pattern across tabs without redesign.

---

## 4. Options compared

### A) Haptics only

**Pros**
- Very small diff
- Reuses existing helper

**Cons**
- No effect on web/PWA
- No visible confirmation text for async success/error

### B) Toast only

**Pros**
- Works on all platforms
- Clear message semantics

**Cons**
- More UI plumbing than haptics
- Loses tactile confirmation on native

### C) Small combined layer (**recommended**)

Use **haptics + tiny toast** on high-value events only.

**Pros**
- Covers native + web
- Minimal but complete UX improvement
- Still small if constrained to a handful of events

**Cons**
- Slightly larger than A

**Recommendation:** **C**, but narrow scope to 5 candidate actions below.

---

## 5. Recommended smallest implementation

### Feedback matrix (v1)

| Action | Haptic | Toast |
|---|---|---|
| Meal registered (`meal.tsx` confirm) | Success | “Refeição registrada” |
| Planned meal registered (`diet.tsx` register) | Light or Success | “Refeição do plano registrada” |
| Shopping item checked/unchecked (`shopping.tsx`) | Keep Light | None (already high-frequency) |
| Shopping list generated (`shopping.tsx`) | Success | “Lista de compras atualizada” |
| Meal plan generated (`diet.tsx`) | Success | “Cardápio gerado” |
| Existing errors (only where already surfaced) | Error haptic optional | Optional toast mirror, no new error sources |

### Implementation boundaries

1. Reuse `src/lib/haptics.ts` and add optional `hapticError()` only if clearly needed.
2. Add a **minimal toast mechanism** (single reusable component/provider or tiny screen-level helper) with:
   - message string
   - type (`success`/`error`)
   - auto-dismiss
3. Trigger toasts only in existing success/error branches; no new API calls or state model changes.

### Keep small

- No queueing system, no animations library, no cross-app redesign.
- No persistence for toasts.
- No new dependency.

---

## 6. Files likely to touch

| File | Why |
|---|---|
| `src/lib/haptics.ts` | Reuse/extend helper functions |
| `app/(tabs)/meal.tsx` | Success feedback on `handleConfirm` |
| `app/(tabs)/diet.tsx` | Planned meal register + meal plan generation success |
| `app/(tabs)/shopping.tsx` | Shopping generation success; keep toggle haptic |
| `src/features/diet/hooks/useMealPlanGenerator.ts` | Possible hook-level success/error callback point |
| `src/features/shopping/hooks/useShoppingListGenerator.ts` | Possible hook-level success/error callback point |
| `src/store/useAppStore.ts` | Read-only understanding (no shape/action redesign) |

If a global toast host is needed, prefer a tiny shared component in `src/components` and wire once in app layout.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Toast spam on repetitive actions | No toast for frequent toggle; only key milestones |
| Duplicate feedback (inline error + toast) | Mirror only where useful; keep copy short |
| Platform mismatch | Haptics no-op on web; toast covers all |
| Scope creep into design system | Keep neutral style, reuse tokens, no full notification system |

---

## 8. Out of scope

- AI / Supabase / Edge / prompt changes
- Zustand persisted shape changes
- Meal/shopping/profile data shape changes
- Screen redesigns
- New dependencies
- Home, Mercados, Auth, onboarding, profile flows
- Reworking business logic in generation/register actions

---

## 9. Acceptance criteria

- [ ] Key success actions produce immediate feedback (haptic on native, toast on all platforms where configured).
- [ ] High-frequency toggle action keeps only lightweight haptic (no toast noise).
- [ ] Existing error handling remains intact; optional toast mirrors do not alter logic.
- [ ] No persisted/store/data shape changes.
- [ ] `npx tsc --noEmit` and `npm run build:web` pass.

---

## 10. Manual test checklist

| # | Scenario | Expected |
|---|---|---|
| 1 | Register meal from Revisar | Success haptic (native) + success toast; navigation unchanged |
| 2 | Register planned meal in Dieta | Button state still updates; success feedback shown |
| 3 | Toggle shopping item repeatedly | Light haptic only; no toast spam |
| 4 | Generate shopping list success | List updates + success feedback |
| 5 | Generate meal plan success | Plan appears + success feedback |
| 6 | Trigger known generation error | Existing inline error still visible; optional error toast if enabled |
| 7 | Web/PWA | Toast visible; no haptic side effects |
| 8 | Android/iOS | No crashes if haptics unavailable/denied |

---

**Smallest practical rollout:** implement combined feedback only for the five key actions above, then revisit expansion after user testing.
