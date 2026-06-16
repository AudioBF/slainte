# Shopping 3C — Checked Items UX Result

**Status:** Implemented. Not committed.  
**Plan:** `docs/private/SHOPPING_3C_CHECKED_ITEMS_PLAN.md`  
**Scope:** View-only reorder of checked items within each supermarket section on Compras. No store, persist, or AI changes.

---

## Summary

Shopping 3C improves in-store scanning on the Compras tab. After Sprint 3A grouped items by supermarket section, checked items still appeared interleaved with unchecked rows in store order. This slice partitions each section at render time so **unchecked items appear first** and **checked items sink to the bottom** of the same section. Section headers emphasize what is left to buy when any item in the section is checked.

The persisted `shopping` array order is unchanged — reordering is computed in the UI layer only.

---

## Files changed

| File | Change |
|---|---|
| `src/features/shopping/shoppingSections.ts` | Added `partitionShoppingByChecked()` — pure helper splitting items into `{ unchecked, checked }` with stable order within each group |
| `src/features/shopping/ShoppingSectionList.tsx` | Partition each section before render; unchecked first, checked last; updated section header counts |
| `docs/private/SHOPPING_3C_CHECKED_ITEMS_RESULT.md` | This document |

**Unchanged:**

- `src/types/index.ts` (`ShoppingItem`)
- `src/store/useAppStore.ts`
- `app/(tabs)/shopping.tsx`
- `src/components/ShoppingListItem.tsx`
- `src/features/shopping/index.ts` (helper not re-exported)
- All other tabs and AI/Edge paths

---

## UX before / after

### Before (Sprint 3A)

| Behavior | Impact |
|---|---|
| Items grouped by section | Good aisle mental model |
| Checked and unchecked interleaved in store order | Strikethrough rows mixed with todo rows while walking an aisle |
| Section header `{label} · {total}` | Count included already-bought items |

### After (Sprint 3C)

| Behavior | Impact |
|---|---|
| Unchecked rows at top of each section | Faster scan for “what’s left here?” |
| Checked rows at bottom of same section | Bought items still visible for uncheck/remove, but out of the primary scan line |
| Header `{label} · {total}` when nothing checked | Same as before |
| Header `{label} · {n} restantes` when any checked | Count reflects remaining work in that aisle |

Global progress card and **Lista da semana** subtitle (`N itens restantes`) unchanged.

---

## Technical notes

### `partitionShoppingByChecked(items)`

```ts
{ unchecked: ShoppingItem[]; checked: ShoppingItem[] }
```

- Single pass over `items` in input order.
- Unchecked items appended to `unchecked`; checked to `checked`.
- Does not mutate the input array or store state.
- Used only by `ShoppingSectionList` (imported from `./shoppingSections`, not exported via `index.ts`).

### Render flow

1. `groupShoppingBySection(items)` — unchanged from 3A (section inference + bucket order from store array).
2. For each section: `partitionShoppingByChecked(section.items)`.
3. Render `[...unchecked, ...checked]` with existing `ShoppingListItem` and dividers.
4. Toggle/remove still call store actions by `item.id`; visual position updates on next render.

### Explicit non-changes

| Area | Status |
|---|---|
| `ShoppingItem` shape | **No change** |
| Zustand store / actions | **No change** |
| Persistence / cloud sync payload | **No change** |
| Supabase / AI / Edge Functions | **No change** |
| Home / Dieta / Refeição / Mercados | **No change** |
| Shopping list generation | **No change** |
| Collapsible “Comprados” | **Not added** |
| Store array order on toggle | **Unchanged** — reorder is view-only |

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

Results:

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed

---

## Manual smoke checklist

| Test | Expected | Pass? |
|---|---|---|
| Empty list | EmptyState unchanged | |
| All unchecked | Same section headers as 3A (`Hortifruti · 3`) | |
| Check one item in a section | Item moves to bottom of that section; header shows `N restantes` | |
| Uncheck item at bottom | Returns to unchecked group; stable relative order among unchecked | |
| Check all items in one section | Section visible; all rows at bottom; header `0 restantes` | |
| Multiple sections partially checked | Each section partitions independently | |
| **Limpar marcados** | Checked rows removed; headers/sections update | |
| Remove unchecked item | Counts update | |
| **Do cardápio** regenerate | All unchecked; partition still correct | |
| Manual add item | Appears in unchecked group for its section | |
| Toggle / remove | Same behavior as before | |
| Home / Dieta / Refeição / Mercados | Unchanged | |

---

## Known trade-offs

1. **Checked items still take vertical space** — they remain expanded at the bottom of each section (strikethrough + reduced opacity). Long shops with many checked items still require scrolling within a section.
2. **Visual jump on check** — item moves within the section on toggle. Expected; store order does not move.
3. **All-checked section still visible** — user clears via **Limpar marcados** or unchecks manually.
4. **No per-section collapse** — collapsible **Comprados** subgroup remains a possible **3C+** follow-up if smoke tests show sections still feel noisy.

---

## Next recommended slice

| Priority | Slice | Notes |
|---|---|---|
| Optional | **3C+ Collapsible Comprados** | Per-section `Comprados · n` expand/collapse if vertical space is still a pain |
| Backlog | **3B Keyword tuning** | Expand section dictionary from real generated lists |
| Backlog | **2D Plano × Real** | Align week comparison by calendar day |

---

*Result doc only. No app code changed in this step.*
