# Meal Review Sticky Footer Polish — Plan

**Status:** Planning only. No app code changed.  
**Goal:** Make the **Revisar** step primary action easier to reach on mobile/PWA without changing meal analysis, macros, AI, or persistence.  
**Context:** Recommended next sprint after 2D and Shopping 3B. Expo SDK 56, PT-BR UI.

---

## 1. Objective

On the meal photo flow step **Revisar**, keep **Registrar no dia** visible and reachable while the user scrolls through editable components — especially on small screens and mobile PWA, where the tab bar and long content push the confirm action out of view.

**Non-goals:** Redesign the meal screen, change AI/store logic, or add dependencies.

---

## 2. Current behavior

**File:** `app/(tabs)/meal.tsx`

| Step | `stepIndex` | UI |
|---|---|---|
| Foto | 0 | Slot chips, camera/gallery, preview |
| Análise | 1 | Same screen with image; **Analisar com IA** inline in card |
| Revisar | 2 | `photoDraft` populated — component cards, add item, totals, slot chips, disclaimer |

**Revisar layout today:**

```
View (root, flex 1)
├── Screen (ScrollView, footerSpace = 88 + 64 when photoDraft)
│   ├── Header, StepIndicator
│   ├── Component cards (editable weight)
│   ├── Add item card
│   ├── Total estimado card
│   ├── Registrar como (ChipGroup)
│   └── Disclaimer card
└── PrimaryActionBar "Registrar no dia" (absolute, aboveTabBar)
```

**Existing patterns:**

- `PrimaryActionBar` — absolute bottom bar, `useSafeAreaInsets`, optional `aboveTabBar` (+64px for tab bar).
- `Screen.footerSpace` — extra `ScrollView` bottom padding so content clears the bar.
- Same pattern on Hoje FAB, onboarding, profile.

**Confirm path:** `handleConfirm()` → `confirmPhotoMeal()` → `router.replace('/(tabs)')` — unchanged.

---

## 3. UX problem

| Issue | Impact |
|---|---|
| **Infrastructure exists but polish is incomplete** | `PrimaryActionBar` already shows on Revisar; users may still report CTA hard to use — likely spacing/overlap, not missing sticky pattern |
| **`footerSpace` is a magic number** (`88 + 64`) | May under/over-pad; last cards (totals, slot chips, disclaimer) can sit under the bar or leave excess gap |
| **Tab bar + sticky bar stack** | On PWA/mobile, CTA sits above tab bar — correct intent, but easy to mis-tune visually |
| **Long component lists** | User edits items at top; must scroll to see totals/slot before confirming — CTA visible but context is far |
| **Keyboard on weight/add inputs** | No `KeyboardAvoidingView`; inputs near bottom may hide behind footer when typing |
| **Analyse step CTA inline** | Less critical — single primary button in card after photo |

**Real pain:** Revisar with many components + keyboard open → footer feels broken or content clipped.

---

## 4. Options compared

### Option A — Sticky footer polish on **Revisar only** ✅ Recommended

Keep `PrimaryActionBar` for step 2 only; improve padding, keyboard behavior, and footer/content coordination.

| Pros | Cons |
|---|---|
| Matches existing architecture | Does not help Analisar step (low need) |
| Smallest diff | Still two layout modes on one screen |
| No new components required | |

### Option B — Sticky footer for **whole meal flow**

Also pin **Analisar com IA** / camera actions in a footer on steps 0–1.

| Pros | Cons |
|---|---|
| Visual consistency | Foto/Análise are short — low value |
| | Competes with tab bar on step 0 |
| | More layout branching for little gain |

**Verdict:** **Option A** — Revisar is the only step with long scroll + confirm CTA. Steps 0–1 already have inline actions in the photo card.

---

## 5. Recommended smallest implementation

**Touch primarily `app/(tabs)/meal.tsx`.** Optionally tiny constant tweak in `PrimaryActionBar` / `Screen` if shared height helper helps — avoid broad refactors.

### A. Fix scroll vs footer clearance

1. Replace magic `footerSpace={88 + 64}` with a **named constant** derived from documented bar anatomy:
   - `PrimaryActionBar` height ≈ padding + button (~48) + border
   - `aboveTabBar` offset (64)
   - optional safe-area note (insets applied on bar, not double-count in footerSpace)
2. Verify last scroll item (disclaimer + slot section) clears the bar on iOS PWA, Android, desktop web (max-width 520).

### B. Keyboard-aware review step (no new deps)

Wrap Revisar scroll region or root in `KeyboardAvoidingView` (iOS `padding`, Android/web sensible default) **only when `photoDraft`** so weight/add `TextInput`s scroll above footer when focused.

### C. Optional micro-layout (same PR if trivial)

- Move **Registrar como** slot `ChipGroup` **above** the component list or directly **above** footer padding block — keeps slot + confirm mentally paired. *Only if inspection shows slot section is often hidden; otherwise defer.*
- Do **not** duplicate totals in footer unless smoke test shows need — avoids scope creep.

### D. Preserve

- `handleConfirm`, `confirmPhotoMeal`, `photoDraft` store actions
- Step indicator, AI badge, component edit logic
- `PrimaryActionBar` label **Registrar no dia**

---

## 6. Files likely to touch

| File | Change |
|---|---|
| `app/(tabs)/meal.tsx` | **Primary** — footerSpace constant, `KeyboardAvoidingView`, optional Revisar section order |
| `src/components/PrimaryActionBar.tsx` | Optional — export `PRIMARY_ACTION_BAR_HEIGHT` or document height; only if meal.tsx needs shared value |
| `src/components/Screen.tsx` | Unlikely — already supports `footerSpace` |

**Do not touch:** `useMealAnalysis`, Edge Functions, `useAppStore` persist shape, other tabs.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Double bottom padding (footerSpace + safe area) | Match Hoje/onboarding working patterns; test on web |
| `KeyboardAvoidingView` on web | Use Platform checks; web often needs less or `undefined` behavior |
| Moving slot chips regresses flow | Keep order change optional; default to padding-only fix |
| Tab bar overlap on desktop | `aboveTabBar` already used elsewhere — reuse |

---

## 8. Out of scope

- AI / Supabase / Edge Functions / prompts
- Zustand store or `LoggedMeal` / `photoDraft` shape changes
- Photo capture, analysis, macro recalculation logic
- Planned meal deep-link behavior (`plannedId`, `plannedName`)
- Home, Dieta, Compras, Mercados, Auth, onboarding, profile
- New npm dependencies (`react-native-keyboard-aware-scroll-view`, etc.)
- Full meal screen redesign
- Sticky footer on Foto/Análise steps (Option B)
- Hiding tab bar on Revisar (separate UX decision)

---

## 9. Acceptance criteria

- [ ] On Revisar with 5+ components, **Registrar no dia** remains visible without scrolling.
- [ ] Last scroll content (disclaimer) is fully readable above the sticky bar.
- [ ] Tapping weight or add-item input does not permanently hide active field behind footer (keyboard test on mobile PWA if available).
- [ ] Foto and Análise steps unchanged in layout and behavior.
- [ ] Confirm still calls `confirmPhotoMeal` and navigates to Hoje.
- [ ] Desktop web (max-width 520) layout acceptable — bar centered, no horizontal clip.
- [ ] `npx tsc --noEmit` and `npm run build:web` pass.

---

## 10. Manual test checklist

| # | Scenario | Expected |
|---|---|---|
| 1 | Revisar, 1 component | CTA visible; no extra bottom gap |
| 2 | Revisar, 8+ components | Scroll components; CTA stays fixed; disclaimer not hidden |
| 3 | Edit weight (last card) | Field visible while typing (mobile/PWA) |
| 4 | Add item flow | Add input usable; confirm still works |
| 5 | Change slot chips | Slot updates; confirm uses selected slot |
| 6 | Confirm | Meal on Hoje; draft cleared |
| 7 | Step Foto | No sticky footer; camera/gallery unchanged |
| 8 | Step Análise (image, no draft) | Analisar button in card; no sticky footer |
| 9 | Deep link from Dieta (`plannedId`) | Plan hint + confirm unchanged |
| 10 | Desktop browser | Bar aligned with content column |

---

## Success metric

User completes **Revisar** without hunting for **Registrar no dia** after editing components — CTA feels pinned, scroll feels natural, inputs remain usable.

---

*Planning doc only. Implementation starts after review.*
