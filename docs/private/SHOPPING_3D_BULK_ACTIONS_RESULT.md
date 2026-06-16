# Shopping 3D — Bulk Actions Result

**Status:** Implemented. Not committed.  
**Plan:** `docs/private/SHOPPING_3D_BULK_ACTIONS_PLAN.md`  
**Scope:** Global **Marcar todos** / **Desmarcar todos** on Compras. No multi-select, per-section actions, or persisted shape changes.

---

## Summary

Shopping 3D adds bulk check/uncheck for the entire shopping list. Users can mark or unmark every item in one tap from the progress card — useful for large weekly lists and for resetting after a dry run. **Desmarcar todos** unchecks items (reversible); **Limpar marcados** still removes checked items from the list (unchanged).

The `shopping` array order is unchanged; only `checked` booleans update. Idempotent store action skips no-op updates.

---

## Files changed

| File | Change |
|---|---|
| `src/store/useAppStore.ts` | Added `setAllShoppingChecked(checked: boolean)` — maps all items; early return when empty or already uniform |
| `app/(tabs)/shopping.tsx` | **Marcar todos** / **Desmarcar todos** buttons in progress card; disabled rules; `hapticLight` on press |
| `docs/private/SHOPPING_3D_BULK_ACTIONS_RESULT.md` | This document |
| `docs/private/PROJECT_BRIEFING.md` | Marked 3D complete; removed from active backlog |

**Unchanged:**

- `src/types/index.ts` (`ShoppingItem`)
- `src/features/shopping/ShoppingSectionList.tsx`
- `src/features/shopping/shoppingSections.ts`
- `src/components/ShoppingListItem.tsx`
- AI / Edge / `useShoppingListGenerator`
- All other tabs

---

## UX before / after

### Before

| Behavior | Impact |
|---|---|
| Check/uncheck one row at a time | Tedious on 30–50 item lists |
| **Limpar marcados** only bulk action | Deletes checked items; no “uncheck all” |
| No fast path to 100% progress | User taps every checkbox |

### After

| Behavior | Impact |
|---|---|
| **Marcar todos** | Sets all items checked; progress 100%; 3C layout shows checked blocks at section bottoms |
| **Desmarcar todos** | Sets all unchecked; reversible reset |
| Buttons visible only when `shopping.length > 0` | Empty list stays clean |
| **Marcar todos** disabled when all checked | No redundant store writes |
| **Desmarcar todos** disabled when none checked | Clear affordance |
| **Limpar marcados** unchanged | Still removes checked items; shown when `checked > 0` |

No toast on bulk actions (per scope). Haptic: `hapticLight` only, matching per-item toggle.

---

## Technical notes

### `setAllShoppingChecked(checked: boolean)`

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

- **Idempotent** — no state update if already all checked/unchecked.
- **No reorder** — same array indices; 3C partition still computed at render.
- **Persist** — same `ShoppingItem` shape; cloud sync debounce unchanged.
- Distinct from `clearCheckedShopping()` which filters out checked rows.

### Screen wiring (`shopping.tsx`)

Derived flags:

- `allChecked` — disable **Marcar todos**
- `anyChecked` — disable **Desmarcar todos** when false; show **Limpar marcados** when true

Action row order: **Do cardápio** → **Marcar todos** / **Desmarcar todos** (when list non-empty) → **Limpar marcados** (when any checked).

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run build:web` | Pass |

---

## Manual test checklist (from plan)

| # | Test | Expected |
|---|---|---|
| 1 | Empty list | Bulk buttons hidden |
| 2 | All unchecked → **Marcar todos** | All checked; progress full |
| 3 | All checked → **Desmarcar todos** | All unchecked |
| 4 | Mixed → **Marcar todos** | All checked |
| 5 | Mixed → **Desmarcar todos** | All unchecked |
| 6 | **Marcar todos** when all checked | Disabled; no-op |
| 7 | **Desmarcar todos** when none checked | Disabled; no-op |
| 8 | **Limpar marcados** after bulk mark | Checked items removed |
| 9 | Bulk mark → toggle one off | Partial state; buttons update |
| 10 | **Do cardápio** regenerate | New list unchecked |
| 11 | Manual add after bulk mark | New item unchecked; **Marcar todos** enabled |
| 12 | 3A/3C sections | Unchecked-first layout after bulk unmark |

---

## Deferred (3D+)

- Multi-select + bulk remove subset  
- Per-section **Marcar** / **Desmarcar**  
- Collapsible **Comprados** (3C+)  
- Optional toast on bulk complete  

---

*Implementation complete per plan v1 scope.*
