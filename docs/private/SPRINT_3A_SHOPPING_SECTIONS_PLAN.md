# Sprint 3A — Shopping List Sections Plan

**Status:** Planning only. No app code changed.  
**Goal:** Group the Compras tab shopping list into practical supermarket sections for real use at Lidl/Tesco/Aldi.  
**Context:** Sprint 2 Smart Home complete (2A–2C + 2P dedup). Moving to Shopping tab. Composer 2.5 → small, controlled slice.

---

## 1. Current Compras behavior

**File:** `app/(tabs)/shopping.tsx`

| Block | Behavior |
|---|---|
| Header | "Compras" / "Lista gerada do seu cardápio" |
| Progress card | `ProgressBar` — checked / total items |
| Actions | **Do cardápio** (AI via `useShoppingListGenerator` → Edge Function), **Limpar marcados** |
| Section | "Lista da semana" + **+ Item** toggle |
| Add form | Manual `name` + `quantity` → `addShoppingItem()` |
| List | Single flat `Card` — `shopping.map()` → `ShoppingListItem` |

**Data model (`ShoppingItem` in `src/types/index.ts`):**

```ts
{ id, name, quantity, checked, fromPlan }
```

**Store actions (`useAppStore`):**

- `toggleShoppingItem(id)` — check/uncheck
- `addShoppingItem(name, quantity)` — manual add (`fromPlan: false`)
- `removeShoppingItem(id)`
- `clearCheckedShopping()` — removes checked items
- `setShopping(items)` — replaces list after AI generation

**Generation path (unchanged in 3A):**

`useShoppingListGenerator` → `generateShoppingList(recipes)` → Edge Function or mock → `mapShoppingListToItems()` → `setShopping()`.

**No shopping selectors exist today** — screen reads `shopping` array directly.

---

## 2. Main UX problem with the flat list

| Problem | Real-world impact |
|---|---|
| **Linear list** | Items appear in AI/recipe order, not store layout |
| **No aisle mental model** | Hard to shop efficiently — jump between produce, meat, and pantry mentally |
| **Mixed categories** | e.g. mock list: brócolis → arroz → ovos → espinafre — zigzag in the shop |
| **Long lists feel longer** | No visual chunks; harder to see what's left per area |
| **Checked items** | Still interleaved; no grouping when partially done |

The list **works** for tracking items but is **not optimized for walking a supermarket**.

---

## 3. Proposed section categories

Fixed order (supermarket walk-friendly for typical Irish layout):

| Order | Section ID | Label (UI) |
|---|---|---|
| 1 | `hortifruti` | Hortifruti |
| 2 | `proteinas` | Proteínas |
| 3 | `laticinios` | Laticínios |
| 4 | `mercearia` | Mercearia |
| 5 | `temperos` | Temperos |
| 6 | `congelados` | Congelados |
| 7 | `outros` | Outros |

**Rules:**

- Show only sections that have **at least one item** (empty sections hidden).
- Section header shows label + optional count: `Hortifruti · 3`.
- Item order **within** a section preserves original list order (stable when checking items).

---

## 4. How to categorize items locally without AI

**Approach:** keyword matching on normalized `item.name` at render time.

```ts
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
```

First matching section wins (keywords ordered from specific → general).

### Keyword map (starter set — PT-BR + common EN)

| Section | Example keywords |
|---|---|
| **Hortifruti** | banana, maçã/maca, brócolis/brocolis, espinafre, tomate, cebola, alho, batata, cenoura, alface, limão/limao, abacate, pepino, pimentão/pimentao, cogumelo, fruta, legume, salada, ervilha fresca, avocado, spinach, broccoli, onion, potato, carrot, lettuce, lemon, apple, banana, tomato, pepper, mushroom, celery, courgette, zucchini |
| **Proteínas** | frango, peito, carne, bife, porco, boi, vitela, atum, salmão/salmão, peixe, camarao/camarão, frango, chicken, beef, pork, steak, turkey, peru, ovo, ovos, egg, tofu, lentilha seca (if ambiguous → mercearia) — **eggs → Proteínas** |
| **Laticínios** | leite, iogurte, yogurt, queijo, cheese, manteiga, butter, creme, cream, requeijão, cottage, mozarela/mozzarella, parmesão, nata |
| **Mercearia** | arroz, rice, massa, pasta, macarrão, feijão, grão/grao, lentilha, aveia, oats, farinha, flour, pão/pao, bread, cereal, azeite, óleo/oleo, oil, vinagre (if not temperos), enlatado, lata, canned, beans, chickpea, grão-de-bico, basmati, quinoa, couscous, molho de tomate (jarred → mercearia) |
| **Temperos** | sal, pimenta, cominho, orégano/oregano, paprika, curry, molho de soja, soy, vinagre, tempero, especiaria, spice, herb, manjericão, salsa seca, caldo, stock cube, mostarda, mustard, ketchup, molho |
| **Congelados** | congelado, frozen, gelado, picada congelada |
| **Outros** | default when no keyword matches |

**Ambiguity handling:**

- Multi-word names: match if **any** keyword is a substring of normalized name (`includes`).
- `"Peito de frango"` → `frango` → Proteínas.
- Unknown AI names → **Outros** (safe fallback).
- Manual items benefit same rules.

**No AI, no Edge Function changes, no generation prompt changes in 3A.**

---

## 5. Persisted data shape — change or compute at render?

**Recommendation: compute at render time. No persist shape change.**

| Option | Verdict |
|---|---|
| Add `section` field to `ShoppingItem` | **Not needed for 3A** — requires migration, sync schema update, AI mapping change |
| Compute `section = inferShoppingSection(name)` in selector | **Preferred** — zero migration, works for existing lists |

**Future (optional):** allow manual section override via stored field — only if keyword accuracy proves insufficient.

**Supabase sync:** `shopping` stays `ShoppingItem[]` JSON — no backend change.

---

## 6. Helper/selectors needed

Add under `src/features/shopping/`:

| Export | Purpose |
|---|---|
| `ShoppingSectionId` | Union type for 7 section ids |
| `SHOPPING_SECTIONS` | Ordered `{ id, label }[]` for display |
| `inferShoppingSection(name: string)` | Returns section id from keyword rules |
| `groupShoppingBySection(items: ShoppingItem[])` | Returns `{ sectionId, label, items: ShoppingItem[] }[]` in display order, skipping empty sections |

**Optional internal helper:**

- `normalizeForMatch(name)` — private to infer module

**Export from** `src/features/shopping/index.ts`.

No changes to `src/store/selectors.ts` unless we prefer centralization — shopping feature folder is enough.

---

## 7. Components to create or modify

### Create

| Component | File | Role |
|---|---|---|
| `ShoppingSectionList` | `src/features/shopping/ShoppingSectionList.tsx` | Renders grouped sections + delegates row to existing `ShoppingListItem` |

**Structure:**

```
Card flat
  └─ Section block (repeat)
       ├─ Section header (label · count)  — typography.subtitle or label
       └─ ShoppingListItem rows (existing component, unchanged props)
```

### Modify

| File | Change |
|---|---|
| `app/(tabs)/shopping.tsx` | Replace flat `shopping.map()` with `<ShoppingSectionList items={shopping} ...handlers />` |
| `src/features/shopping/index.ts` | Export helpers + component |

### Do not modify

- `ShoppingListItem.tsx` — reuse as-is
- `useShoppingListGenerator.ts`
- `generate-shopping-list` Edge Function
- AI schemas/prompts
- Other tabs

**Design:** cream section headers optional (`colors.cream` subtle band); forest text; match Home section spacing. No new colors.

---

## 8. Manual test checklist

| # | Scenario | Expected |
|---|---|---|
| 1 | Empty list | EmptyState unchanged; no sections |
| 2 | Mock/generate list | Items grouped into sections; Outros only for unmatched |
| 3 | Manual add "Banana" | Appears under Hortifruti |
| 4 | Manual add "Peito de frango" | Proteínas |
| 5 | Manual add "Arroz basmati" | Mercearia |
| 6 | Toggle check | Item stays in same section; progress bar updates |
| 7 | Remove item | Section hides when last item removed |
| 8 | Limpar marcados | Sections collapse/update correctly |
| 9 | Regenerate from plan | New list regroups (no stale sections) |
| 10 | Mixed PT/EN names from AI | Reasonable bucket or Outros |
| 11 | Home / Dieta / Mercados | Unchanged |

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Misclassification** | Acceptable for v1; Outros fallback; expand keywords from real lists |
| **AI item names vary** | Substring matching + bilingual keywords |
| **Eggs / oils / sauces ambiguity** | Document defaults; tune keywords after real use |
| **Section order vs store layout** | Fixed order is good enough for Lidl/Tesco; not user-configurable in 3A |
| **Performance** | O(n × keywords) on small lists — negligible |
| **Checked items at bottom** | Out of scope; keep order within section |

---

## 10. Strict out-of-scope items

| Item | Reason |
|---|---|
| AI section assignment in generation prompt | No AI in 3A |
| Edge Function / schema changes | Constraint |
| `ShoppingItem.section` persist field | Avoid migration unless necessary |
| Drag-and-drop reorder | Too large |
| Collapse checked sections | Polish later |
| Price comparison | Future |
| Tesco/Lidl product matching | Future |
| Markets tab changes | Constraint |
| Home / Dieta / Meal changes | Constraint |
| Merge duplicate items across sections | Separate slice |
| User-editable section per item | Future |
| Sprint 2D (`selectWeekComparisonByDay`) | Not shopping |

---

## 11. Recommendation — smallest useful implementation slice

**Sprint 3A scope (one PR, ~0.5–1 day):**

1. **`inferShoppingSection.ts`** — keyword map + normalize (~80 lines)
2. **`groupShoppingBySection.ts`** — pure grouper (~30 lines)
3. **`ShoppingSectionList.tsx`** — section headers + map to `ShoppingListItem`
4. **`shopping.tsx`** — swap flat list for grouped list only

**Do not:**

- Touch AI generation
- Add persist fields
- Add section picker on manual add (always infer from name)

**Success criteria:** Open Compras with a generated list → see Hortifruti / Proteínas / Mercearia blocks → shop without scrolling a random-order list.

**Follow-up slices (later):**

- **3B:** Expand keyword dictionary from real weekly lists
- **3C:** Collapse checked items or move to bottom per section
- **3D:** Optional manual section override on add/edit

---

## Appendix: file reference

| Area | Path |
|---|---|
| Shopping screen | `app/(tabs)/shopping.tsx` |
| Item row | `src/components/ShoppingListItem.tsx` |
| Store | `src/store/useAppStore.ts` → `shopping`, `addShoppingItem`, etc. |
| Type | `src/types/index.ts` → `ShoppingItem` |
| Generator hook | `src/features/shopping/hooks/useShoppingListGenerator.ts` |
| AI mapping | `src/services/ai/generate-shopping-list.ts` → `mapShoppingListToItems` |
| Mock sample | `src/data/mock.ts` → `mockShopping` |

---

## Prior work status

**Sprint 2P (Home dedup):** committed and pushed (`4ed9e62`). Deploy smoke test recommended before starting 3A implementation.

**Sprint 2D:** intentionally deferred — do not mix with Shopping work.
