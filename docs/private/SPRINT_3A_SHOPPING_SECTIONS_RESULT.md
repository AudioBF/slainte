# Sprint 3A — Shopping List Sections Result

**Status:** Implemented. Not committed.  
**Scope:** Group Compras list by supermarket sections using local keyword rules. No AI, no persist changes.

---

## Files changed

| File | Change |
|---|---|
| `src/features/shopping/shoppingSections.ts` | **New** — types, keywords, `inferShoppingSection`, `groupShoppingBySection` |
| `src/features/shopping/ShoppingSectionList.tsx` | **New** — section headers + `ShoppingListItem` rows |
| `src/features/shopping/index.ts` | Export helpers and component |
| `app/(tabs)/shopping.tsx` | Replace flat list with `ShoppingSectionList` |
| `docs/private/SPRINT_3A_SHOPPING_SECTIONS_RESULT.md` | This document |

---

## Section categories implemented

Fixed display order:

1. Hortifruti  
2. Proteínas  
3. Laticínios  
4. Mercearia  
5. Temperos  
6. Congelados  
7. Outros (fallback)

Empty sections are hidden. Headers: `Hortifruti · 3`.

---

## Keyword approach

- `normalizeForMatch()` — lowercase + NFD diacritic strip  
- Substring match on normalized `item.name`  
- PT-BR + English keyword lists per section  
- **First matching section** in fixed order wins  
- Unmatched → `outros`  
- Section computed at **render time** — `ShoppingItem` shape unchanged  

---

## Manual test checklist

| Test | Expected | Pass? |
|---|---|---|
| Empty list | EmptyState unchanged | |
| Banana | Hortifruti | |
| Peito de frango | Proteínas | |
| Arroz basmati | Mercearia | |
| Ovos | Proteínas | |
| Iogurte | Laticínios | |
| Orégano / cominho | Temperos | |
| Unknown item | Outros | |
| Toggle check | Progress bar updates | |
| Remove last item in section | Section disappears | |
| Limpar marcados | Sections update | |
| Do cardápio regenerate | List regroups | |
| Home / Dieta / Mercados | Unchanged | |

---

## Known limitations

1. **Keyword false positives/negatives** — e.g. short tokens, bilingual AI names; tune dictionary in 3B.  
2. **No manual section override** — always inferred from name.  
3. **Checked items stay in place** — no collapse or move-to-bottom.  
4. **Congelados late in order** — e.g. "brócolis congelado" may match Hortifruti before Congelados.  
5. **Plain "Sal"** — may land in Outros unless name includes "sal grosso" / "sal marinho".

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

## Next recommended slice

**Sprint 3B — Keyword tuning**

- Expand dictionary from real generated lists  
- Optional: sort keywords by length within section  
- Optional: collapse checked items per section  

**Deferred:** persist `section` field, Lidl/Tesco matching, AI-assigned sections.
