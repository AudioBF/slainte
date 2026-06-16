# Shopping 3B — Keyword Dictionary Expansion Result

**Status:** Implemented (includes post-commit safety polish). Not committed in this doc step.  
**Plan:** `docs/private/SHOPPING_3B_KEYWORDS_PLAN.md`  
**Scope:** Expand local section keyword inference only. No store, AI, or UI changes.

---

## Summary

Shopping 3B improves supermarket section classification on Compras by adding **priority passes** for common substring conflicts and a **small high-value keyword set** per section. Section is still computed at render time from `item.name`. Sprint 3A section grouping and 3C checked-item partition are unchanged.

A follow-up **safety polish** removed bare `gelado`/`gelada` and generic `lata` to avoid false positives (e.g. iogurte gelado → Congelados, lata de atum → Mercearia).

---

## Files changed

| File | Change |
|---|---|
| `src/features/shopping/shoppingSections.ts` | Priority passes, keyword expansion, safety polish |
| `docs/private/SHOPPING_3B_KEYWORDS_RESULT.md` | This document |

**Only implementation file:** `src/features/shopping/shoppingSections.ts`

---

## What changed

### Priority passes (before main section loop)

| Pass | Purpose | Examples |
|---|---|---|
| Temperos (broth) | Existing from 3A | caldo de legumes, stock, broth |
| **Congelados** | Frozen before produce | brócolis congelado, mix de vegetais congelados, `congelado*`, frozen |
| **Mercearia** | Pantry before laticínios/hortifruti | leite de coco, extrato de tomate, passata, molho de tomate |
| **Temperos (herbs)** | Herbs before hortifruti `cebola` | cebolinha, coentro, cilantro |

### SECTION_KEYWORDS expansion

~10–15 high-value PT/EN terms per section (wrap integral, linhaça, iogurte grego, peito de peru, tomate cereja, sal fino, etc.) — not the full plan dump.

### Preserved behavior

- **3A fixes** still pass (caldo, paprica, dill, salsinha, alecrim, aipo, chia, …).
- **3C** `partitionShoppingByChecked()` and `ShoppingSectionList` render unchanged.

---

## Safety decisions

| Decision | Rationale |
|---|---|
| **Bare `sal` exact-only** | `normalized === 'sal'` → Temperos; avoids `salmão`, `salada` false positives |
| **No bare `gelado` / `gelada`** | Removed from Congelados; avoids iogurte gelado, café gelado misclassified as frozen aisle |
| **No generic `lata`** | Removed from Mercearia; canned fish stays Proteínas via `lata de atum`, `atum enlatado`, `atum em lata`, `canned tuna` |
| **Specific canned pantry phrases** | `milho enlatado`, `enlatado de milho` kept in Mercearia |

---

## Manual regression

### Initial 3B (24 cases) — passed

Includes 3A regression items plus cebolinha, extrato de tomate, leite de coco, brócolis congelado, linhaça, wrap integral, salmão, salada crua, bare Sal, etc.

### Safety polish (7 cases) — passed

| Input | Expected |
|---|---|
| Brócolis congelado | Congelados |
| Mix de vegetais congelados | Congelados |
| Iogurte gelado | Laticínios |
| Café gelado | Outros |
| Lata de atum | Proteínas |
| Atum em lata | Proteínas |
| Item nonsense XYZ | Outros |

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
| `ShoppingItem` shape | No change |
| Zustand store | No change |
| Persistence / cloud sync | No change |
| Supabase | No change |
| AI prompts | No change |
| Edge Functions | No change |
| Shopping list generation | No change |
| UI layout / Compras screen structure | No change |
| Home / Dieta / Refeição / Mercados / Auth / onboarding / profile | No change |

---

## Known monitoring points

1. **Real AI-generated lists** may still produce unknown or compound names → **Outros** or wrong section until keywords are added.
2. **Bare `enlatado`** in Mercearia may still match generic canned goods; protein phrases should win when fish/meat is named.
3. **Future 3B+** — expand keywords incrementally from screenshots and weekly generated lists; no architecture change required.

---

## Next recommended slice

**Sprint 2D** — align Plano × Real by calendar day. Optional follow-up: **Shopping 3C+** collapsible Comprados.

---

*Result doc only. No app code changed in this step.*
