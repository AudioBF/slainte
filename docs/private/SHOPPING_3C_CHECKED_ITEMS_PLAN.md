# Shopping 3C — Checked Items UX Plan

**Status:** Planning only. No app code changed.  
**Goal:** On the Compras tab, make **remaining** items easy to scan while shopping; checked items should not compete visually with what is still left to buy.  
**Context:** Sprint 3A complete (list grouped by supermarket sections). Composer 2.5 → small, controlled slice.  
**Prerequisite:** Sprint 3A deployed and keyword tuning merged.

---

## 1. Current behavior

### Screen (`app/(tabs)/shopping.tsx`)

| Block | Behavior |
|---|---|
| Progress card | `ProgressBar` — `checked / total` |
| Actions | **Do cardápio** (AI generation), **Limpar marcados** (removes all checked items from store) |
| Section subtitle | `"N itens restantes"` when list non-empty (`total - checked`) |
| List | `ShoppingSectionList` receives full `shopping` array |

Store reads/writes only; no shopping selectors. Toggle does not reorder the array.

### Grouping (`src/features/shopping/shoppingSections.ts`)

- `groupShoppingBySection(items)` buckets by `inferShoppingSection(item.name)`.
- **Order within a section** = order items first appear in the input `shopping` array (stable on check/uncheck).
- Section headers: `{label} · {total in section}` (includes checked and unchecked).
- Empty sections hidden.

### List UI (`src/features/shopping/ShoppingSectionList.tsx`)

- One flat list per section; checked and unchecked **interleaved** in store order.
- Reuses `ShoppingListItem` for every row.

### Row UI (`src/components/ShoppingListItem.tsx`)

- Checked state: checkbox filled, name **strikethrough**, row `opacity: 0.65`.
- Toggle and remove work the same for checked/unchecked.

### Store (`src/store/useAppStore.ts`)

```ts
ShoppingItem = { id, name, quantity, checked, fromPlan }
```

| Action | Effect |
|---|---|
| `toggleShoppingItem(id)` | Flips `checked`; **does not move** item in array |
| `clearCheckedShopping()` | Filters out all `checked === true` |
| `setShopping(items)` | Replaces list (AI generation) |

**Persist:** `shopping` is in the Zustand persist slice → Supabase sync. No UI-only fields today.

---

## 2. UX problem

| Problem | In-store impact |
|---|---|
| **Checked rows stay in place** | After marking “arroz” in Mercearia, it still sits between unchecked items — visual noise while walking the aisle |
| **Strikethrough + opacity is not enough** | User must scan every row in each section to find what is left |
| **Section count includes bought items** | `Mercearia · 5` reads like five things to pick up when two are already in the cart |
| **Progress bar helps globally, not per aisle** | Subtitle “3 itens restantes” is good but the list body does not reinforce it |

Sprint 3A fixed **where** items live (sections). Sprint 3C fixes **what draws attention** within each section during an active shop.

---

## 3. Options compared

### Option A — Move checked items to the bottom **within each section**

After grouping, partition each section’s items: **unchecked first**, **checked last** (stable relative order within each partition).

| Pros | Cons |
|---|---|
| Smallest code change (view-layer sort only) | Checked rows still visible when scrolling a long section |
| Keeps aisle context — easy to uncheck a mistake in the same section | Does not reduce vertical space |
| No new interaction pattern | Slightly weaker “focus” than full collapse |
| Works with existing `ShoppingListItem` styles | |

### Option B — Collapse checked items into a **“Comprados”** subgroup (per section or global)

Hide checked rows behind a tappable row, e.g. `Comprados · 2 ▼`, per section (or one global block at list bottom).

| Pros | Cons |
|---|---|
| Strongest focus on remaining items | New UI: expand/collapse state, copy, a11y |
| Less scroll in busy sections | Uncheck/remove requires an extra tap when collapsed |
| Matches mental model “done vs todo” | More layout edge cases (all checked in section, single checked item) |
| | Risk of scope creep (animation, remember expanded state, global vs per-section debate) |

### Variants considered (not recommended for 3C)

| Variant | Why skip |
|---|---|
| Global single “Comprados” section at list bottom | Loses aisle context; harder to uncheck in context |
| Reorder in Zustand on toggle | Mutates persist order; sync surprises; out of scope |
| Hide checked items entirely until “Limpar marcados” | No undo path without removing items |

---

## 4. Recommended option for this sprint

**Option A — move checked to the bottom within each section.**

**Rationale:**

1. **Smallest controlled diff** — one partition/sort in grouping or list render; no new components required for v1.
2. **Meets the core job** — unchecked items appear at the top of each aisle block; checked sink below a natural scan line.
3. **Low risk** — no persist shape change, no store changes, no collapse state.
4. **Composable** — if smoke test still feels noisy, **3C+** can add per-section `Comprados · n` collapse (Option B) without redoing 3A/3C work.

**Small UX additions bundled with Option A (still in scope):**

- Section header shows **remaining count** when section has both states: `Mercearia · 3 restantes` (or `3` when all unchecked).
- Optional **hairline divider** between unchecked and checked blocks when both exist (render-only in `ShoppingSectionList`).

**Defer to follow-up (3C+ / optional stretch):** per-section collapsible “Comprados” — only if Option A smoke test is insufficient.

---

## 5. Files to modify

| File | Change |
|---|---|
| `src/features/shopping/shoppingSections.ts` | Add helper to partition items `{ unchecked, checked }` or sort checked last inside `groupShoppingBySection` (prefer helper + keep grouping pure) |
| `src/features/shopping/ShoppingSectionList.tsx` | Render unchecked block, optional divider, checked block; update header count to emphasize **restantes** |
| `src/features/shopping/index.ts` | Export helper only if needed externally (likely internal) |

**Probably unchanged:**

| File | Notes |
|---|---|
| `app/(tabs)/shopping.tsx` | Subtitle already shows restantes; touch only if copy alignment needed |
| `src/components/ShoppingListItem.tsx` | Existing checked styling sufficient |
| `src/store/useAppStore.ts` | No reorder on toggle |
| `src/types/index.ts` | No shape change |

---

## 6. Persisted data shape changes

**None.**

- Sorting/partitioning is **computed at render time** from existing `checked: boolean`.
- No new fields (`collapsed`, `section`, `sortIndex`, etc.).
- Cloud sync and `clearCheckedShopping` behavior unchanged.

---

## 7. Manual test checklist

| # | Test | Expected |
|---|---|---|
| 1 | Fresh list, all unchecked | Same as today; headers show total count |
| 2 | Check one item in a multi-item section | Unchecked stay on top; checked moves to bottom of **that section only** |
| 3 | Uncheck item moved to bottom | Returns to unchecked group; order among unchecked stable (preserve original relative order) |
| 4 | Check all items in one section | Section still visible; all rows checked at bottom; header reflects 0 restantes |
| 5 | Multiple sections partially checked | Each section partitions independently |
| 6 | Single-item section checked | One row at bottom; header `0 restantes` or equivalent |
| 7 | **Limpar marcados** | Checked rows removed; sections update/disappear |
| 8 | Remove unchecked item | Counts and partitions update |
| 9 | **Do cardápio** regenerate | New list all unchecked; grouping + partition still correct |
| 10 | Manual add while shopping | New item unchecked at end of its section’s unchecked group |
| 11 | Long section (10+ items), check half | Top of section scannable without strikethrough interleaving |
| 12 | Home / Dieta / Refeição / Mercados | Unchanged |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Order feels “jumpy” on check** | Expected — item moves within section only; no cross-section jump. Document in result doc. |
| **Header count confusion** | Use explicit “restantes” in label when `checked > 0` in section |
| **All-checked section still visible** | Accept for v1; user can **Limpar marcados** or uncheck; collapse is follow-up |
| **Partition logic duplicated** | Single helper in `shoppingSections.ts`; unit-testable pure function |
| **Accessibility** | Row order change is visual only; checkbox labels unchanged |

---

## 9. Strict out-of-scope

- AI calls or prompt changes  
- Edge Functions  
- `ShoppingItem` or Zustand persist shape changes  
- Reordering the persisted `shopping` array on toggle  
- Home, Dieta, Refeição, Mercados tabs  
- Shopping list **generation** (`useShoppingListGenerator`, `setShopping` mapping)  
- Price / product / Lidl–Tesco matching  
- Full Compras screen redesign  
- New persist field for collapse preference  
- Animations / Reanimated  
- Keyword dictionary expansion (that is **3B**)  
- Commit in planning phase  

---

## 10. Smallest implementation slice

**Single PR-sized change (~30–60 lines):**

1. Add `partitionShoppingByChecked(items: ShoppingItem[]): { unchecked: ShoppingItem[]; checked: ShoppingItem[] }` in `shoppingSections.ts` (preserves stable order within each array).

2. In `ShoppingSectionList`, for each section group:
   - Partition `section.items`.
   - Render `unchecked` rows.
   - If both partitions non-empty → hairline divider.
   - Render `checked` rows.

3. Update section header:
   - If any checked in section: `{label} · {unchecked.length} restantes`
   - Else: `{label} · {items.length}` (unchanged)

4. Run `npx tsc --noEmit` and `npm run build:web`.

5. Document in `docs/private/SHOPPING_3C_CHECKED_ITEMS_RESULT.md` after implementation.

**Explicitly not in v1 slice:** collapsible “Comprados”, global bottom bucket, store changes, `ShoppingListItem` API changes.

---

## 11. Success criteria

- User opening Compras mid-shop sees **unchecked items first** in every section.  
- No regression to 3A section inference or generation flows.  
- `ShoppingItem` and sync payload unchanged.  
- Improves real use: “what’s left in this aisle?” answerable from the **top** of each section block.

---

*Planning doc only. Implementation starts after review.*
