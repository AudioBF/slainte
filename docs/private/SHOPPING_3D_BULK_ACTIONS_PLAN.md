# Shopping 3D — Bulk Actions Plan

**Status:** Planning only. No app code changed.  
**Goal:** On the Compras tab, let users **mark or unmark the entire list** in one tap — `Marcar todos` / `Desmarcar todos` — without tapping each row.  
**Context:** Sprint 3A (sections), 3B (keywords), and 3C (checked-at-bottom + restantes headers) are complete. This is the next recommended shopping slice.  
**Prerequisite:** 3A–3C merged and smoke-tested on web PWA.

---

## 1. Current behavior

### Screen (`app/(tabs)/shopping.tsx`)

| Block | Behavior |
|---|---|
| Progress card | `ProgressBar` — `checked / total` |
| Actions | **Do cardápio** (AI generation), **Limpar marcados** (removes checked items from store) |
| Section subtitle | `"N itens restantes"` when list non-empty (`total - checked`) |
| List | `ShoppingSectionList` — sections, unchecked first, checked at bottom (3C) |

There is **no bulk check/uncheck**. Users must tap each `ShoppingListItem` checkbox individually.

### List UI (`src/features/shopping/ShoppingSectionList.tsx`)

- Groups via `groupShoppingBySection(items)`.
- Partitions each section with `partitionShoppingByChecked()` — unchecked rows first, checked last.
- Section headers: `{label} · {n}` or `{label} · {n} restantes` when section has checked items.
- No per-section actions.

### Row UI (`src/components/ShoppingListItem.tsx`)

- Single-item toggle via `onToggle`; remove via `onRemove`.
- No selection mode, no long-press, no batch UI.

### Store (`src/store/useAppStore.ts`)

```ts
ShoppingItem = { id, name, quantity, checked, fromPlan }
```

| Action | Effect |
|---|---|
| `toggleShoppingItem(id)` | Flips `checked` for one item; does not reorder array |
| `clearCheckedShopping()` | Filters out all `checked === true` (delete, not uncheck) |
| `setShopping(items)` | Replaces list (AI generation) |

**Persist:** `shopping` is in the Zustand persist slice → Supabase sync. No bulk `checked` setter today.

---

## 2. UX problem

| Problem | In-store impact |
|---|---|
| **Large lists are tedious** | A weekly plan can produce 30–50 items; marking each row is slow in the aisle |
| **No undo for “I checked everything by mistake”** | User must tap each checked row to uncheck; `Limpar marcados` **deletes** items instead of unchecking |
| **`Limpar marcados` ≠ Desmarcar todos** | Existing button removes bought items from the list; users may expect an “uncheck all” affordance nearby |
| **Progress bar updates only per tap** | No fast path to 100% when user wants to pre-mark before shopping or reset after a dry run |

3A–3C improved **scanning** (sections, restantes, checked at bottom). 3D adds **batch state change** for the whole list.

---

## 3. Scope for this sprint

### In scope (v1)

| Feature | Description |
|---|---|
| **Marcar todos** | Set `checked: true` on every item in `shopping` |
| **Desmarcar todos** | Set `checked: false` on every item in `shopping` |
| **Global actions only** | Buttons apply to the full list, not per section |
| **No-op guard** | Skip store update (and optional haptic) when action would change nothing |
| **Toast (optional)** | Light success toast on bulk action — align with toast v1 pattern if copy feels right |

### Explicitly deferred (3D+ / separate slice)

| Feature | Why defer |
|---|---|
| **Multi-select mode** | New interaction model (selection state, toolbar, a11y); larger than v1 |
| **Bulk remove selected** | Depends on multi-select; `clearCheckedShopping` already covers “remove all checked” |
| **Per-section Marcar/Desmarcar** | Useful but doubles UI surface; validate global actions first |
| **Collapsible Comprados (3C+)** | Separate backlog item |
| **Animations** | Out of scope per project conventions |

The PROJECT_BRIEFING mentions multi-select and bulk remove under “Shopping 3D”; this plan **narrows v1** to global mark/unmark all — the highest-value, smallest diff — and documents follow-ups as 3D+.

---

## 4. Options compared

### Option A — Global buttons in the progress card (recommended)

Add **Marcar todos** and **Desmarcar todos** beside existing **Do cardápio** / **Limpar marcados** in the top `Card`.

| Pros | Cons |
|---|---|
| Matches existing action cluster | Action row may wrap on narrow screens (already `flexWrap`) |
| One store action, one screen touch point | Does not help “only Mercearia” aisle-by-aisle |
| Clear distinction from **Limpar marcados** (uncheck vs delete) | |
| Minimal new components | |

**Visibility variants:**

| Variant | Behavior |
|---|---|
| **A1 — Always show both** | Disable when no-op (`Marcar` when all checked, `Desmarcar` when none checked) |
| **A2 — Contextual single button** | Show only `Marcar todos` if any unchecked, else `Desmarcar todos` |
| **A3 — Show both only when mixed** | Hide redundant button when list is uniform |

**Recommendation:** **A1** — both labels visible when `shopping.length > 0`, disabled when no-op. Predictable copy; user always sees both affordances. Matches dual-button pattern of **Do cardápio** + **Limpar marcados**.

### Option B — Per-section header actions

`SectionAction` on each `ShoppingSectionList` header: mark/unmark items in that section only.

| Pros | Cons |
|---|---|
| Aisle-aligned workflow | 7 section headers × 2 actions = noisy |
| Smaller blast radius per tap | Requires passing section filter into store or screen callbacks |
| | Harder to discover than global actions |

**Defer to 3D+** if global actions prove insufficient in real shopping tests.

### Option C — Multi-select mode

Enter “selection mode”; tap rows to select; toolbar: check selected / remove selected.

| Pros | Cons |
|---|---|
| Maximum flexibility | New ephemeral UI state, row chrome, exit mode, web a11y |
| Enables bulk remove of arbitrary subset | Far beyond “Marcar todos / Desmarcar todos” |
| | Persist/sync unchanged but UX complexity high |

**Not v1.**

---

## 5. Recommended option

**Option A — global `Marcar todos` / `Desmarcar todos` in the progress card (variant A1).**

**Rationale:**

1. **Smallest controlled diff** — one new store action, two buttons, wire handlers in `shopping.tsx`.
2. **Directly solves the stated goal** — bulk mark and unmark without multi-select machinery.
3. **Complements 3C** — unchecked-first layout still applies after bulk mark; user sees all rows sink to checked blocks per section.
4. **Clarifies Limpar marcados** — uncheck-all is reversible; clear removes items permanently.

**Copy (PT-BR):**

| Control | Label |
|---|---|
| Bulk check | `Marcar todos` |
| Bulk uncheck | `Desmarcar todos` |
| Existing delete | `Limpar marcados` (unchanged) |

**Optional toast messages (if enabled):**

- Marcar: `Todos os itens marcados`
- Desmarcar: `Marcações removidas`

Keep toasts lightweight; bulk actions are reversible so toast is optional — prefer haptic-only if the action row feels crowded with feedback.

---

## 6. Files to modify

| File | Change |
|---|---|
| `src/store/useAppStore.ts` | Add `setAllShoppingChecked(checked: boolean)` — maps all items; no-op if already uniform |
| `app/(tabs)/shopping.tsx` | Wire buttons, disabled logic, `hapticLight` / optional `hapticSuccess` + toast |

**Probably unchanged:**

| File | Notes |
|---|---|
| `src/features/shopping/ShoppingSectionList.tsx` | Re-renders from store; 3C partition still works |
| `src/features/shopping/shoppingSections.ts` | No inference changes |
| `src/components/ShoppingListItem.tsx` | Row API unchanged |
| `src/types/index.ts` | No shape change |
| AI / Edge / `useShoppingListGenerator` | Unaffected |

---

## 7. Store design

### New action

```ts
setAllShoppingChecked: (checked: boolean) => void;
```

**Implementation sketch:**

```ts
setAllShoppingChecked: (checked) =>
  set((s) => {
    if (s.shopping.length === 0) return s;
    if (s.shopping.every((item) => item.checked === checked)) return s;
    return {
      shopping: s.shopping.map((item) =>
        item.checked === checked ? item : { ...item, checked },
      ),
    };
  }),
```

**Properties:**

- Does **not** reorder `shopping` array (same rule as `toggleShoppingItem`).
- Does **not** remove items (`clearCheckedShopping` remains separate).
- Triggers existing debounced cloud sync like any other shopping mutation.
- Idempotent — safe to call repeatedly.

**Alternative considered:** two actions `checkAllShopping` / `uncheckAllShopping`. Rejected — single parameterized action is DRY and testable.

---

## 8. UI layout (`shopping.tsx`)

### Action row (inside progress `Card`)

Current:

```
[ Do cardápio ]  [ Limpar marcados ]   // Limpar only if checked > 0
```

Proposed when `shopping.length > 0`:

```
[ Do cardápio ]
[ Marcar todos ]  [ Desmarcar todos ]  [ Limpar marcados? ]
```

**Layout rules:**

- Keep `styles.actions` (`flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap`).
- **Do cardápio** stays first (primary generation action).
- Bulk row: **Marcar todos** + **Desmarcar todos** — `variant="outline"`, same `styles.genBtn` as siblings.
- **Limpar marcados** — keep current rule: visible only when `checked > 0`; unchanged behavior.

### Disabled logic

| Button | Disabled when |
|---|---|
| Marcar todos | `shopping.length === 0` OR all items `checked` |
| Desmarcar todos | `shopping.length === 0` OR no item `checked` |
| Do cardápio | unchanged (`generating \|\| !hasPlan`) |
| Limpar marcados | unchanged (hidden when `checked === 0`) |

### Handlers

```ts
function handleMarkAll() {
  hapticLight();
  setAllShoppingChecked(true);
  // optional: hapticSuccess + showToast('Todos os itens marcados');
}

function handleUnmarkAll() {
  hapticLight();
  setAllShoppingChecked(false);
}
```

Use `hapticSuccess` only if product wants stronger feedback on bulk complete; default **light** to match per-item toggle.

---

## 9. Persisted data shape changes

**None.**

- Only `checked` booleans change on existing items.
- No new fields (`selected`, `selectionMode`, etc.).
- `ShoppingItem` type unchanged.
- Sync payload structure unchanged.

---

## 10. Manual test checklist

| # | Test | Expected |
|---|---|---|
| 1 | Empty list | Bulk buttons not shown (or disabled); no store errors |
| 2 | List with all unchecked → **Marcar todos** | All rows checked; progress 100%; 3C layout shows checked blocks at section bottoms |
| 3 | All checked → **Desmarcar todos** | All unchecked; progress 0%; headers show full counts |
| 4 | Mixed → **Marcar todos** | Remaining unchecked become checked; **Desmarcar todos** becomes enabled |
| 5 | Mixed → **Desmarcar todos** | All unchecked; checked blocks empty |
| 6 | **Marcar todos** when already all checked | No-op; button disabled; no spurious sync |
| 7 | **Desmarcar todos** when none checked | No-op; button disabled |
| 8 | **Limpar marcados** after bulk mark | Checked items removed from list; bulk buttons update |
| 9 | Bulk mark → toggle one item off | Partial state; both bulk buttons usable |
| 10 | **Do cardápio** regenerate | New list all unchecked; bulk buttons correct |
| 11 | Manual add after bulk mark | New item unchecked; Marcar todos enabled again |
| 12 | Cloud sync (signed in) | Bulk change persists after refresh |
| 13 | Home / Dieta / Refeição / Mercados | Unchanged |
| 14 | Narrow web width | Action buttons wrap; no overlap |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| **Confusion with Limpar marcados** | Distinct labels: *Desmarcar* = uncheck, *Limpar marcados* = delete; place bulk uncheck before clear |
| **Accidental mark all** | Reversible via **Desmarcar todos**; do not auto-trigger **Limpar marcados** |
| **Long list performance** | Single `map` over array; same cost as N toggles but one render |
| **Sync spam** | One `set` call; existing 2.5s debounce unchanged |
| **Section headers after bulk mark** | All sections show `0 restantes`; expected — document in result doc |
| **Action row clutter** | `flexWrap`; if too busy in QA, move bulk pair below progress bar in follow-up polish |

---

## 12. Strict out-of-scope

- AI calls, prompts, Edge Functions  
- `ShoppingItem` or persist version migration  
- Multi-select mode, long-press selection, bulk remove selected  
- Per-section bulk actions (3D+)  
- Reordering persisted array on check  
- Home, Dieta, Refeição, Mercados tabs  
- Shopping list generation logic changes  
- Quantity aggregation, market mode, price matching  
- Animations / Reanimated  
- Commit in planning phase  

---

## 13. Smallest implementation slice

**Single PR-sized change (~40–70 lines):**

1. Add `setAllShoppingChecked(checked: boolean)` to `useAppStore` (interface + implementation + export via hook).

2. In `shopping.tsx`:
   - Select `setAllShoppingChecked` from store.
   - Derive `allChecked`, `anyChecked`, `hasItems` from `shopping`.
   - When `hasItems`, render **Marcar todos** and **Desmarcar todos** with disabled rules from §8.
   - Wire handlers with `hapticLight`.

3. Run `npx tsc --noEmit` and `npm run build:web`.

4. Document in `docs/private/SHOPPING_3D_BULK_ACTIONS_RESULT.md` after implementation.

**Explicitly not in v1 slice:** per-section actions, multi-select, toast (unless quick win during impl), `ShoppingSectionList` API changes.

---

## 14. Success criteria

- User can mark or unmark the **entire** shopping list in one tap from Compras.  
- **Desmarcar todos** is clearly distinct from **Limpar marcados** (uncheck vs delete).  
- No regression to 3A section grouping, 3B keywords, or 3C checked ordering.  
- `ShoppingItem` shape and sync payload unchanged.  
- Improves real use: pre-marking before a shop or resetting after testing without N taps.

---

## 15. Follow-up backlog (3D+)

| Item | Trigger to implement |
|---|---|
| Per-section **Marcar** / **Desmarcar** | User feedback: global actions insufficient aisle-by-aisle |
| Multi-select + bulk check/remove subset | Need to act on arbitrary item sets without all-or-nothing |
| Collapsible **Comprados** per section | 3C+ — list still noisy after bulk mark |
| Confirmation before **Marcar todos** on large lists | Only if accidental taps reported in testing |

---

*Planning doc only. Implementation starts after review.*
