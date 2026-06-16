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

### Keyword tuning (post-screenshot fixes)

| Item | Was | Now | Fix |
|---|---|---|---|
| Caldo de legumes | Hortifruti (`legume` in "legumes") | Temperos | Priority pass for `caldo` / `stock` / `broth` before section loop |
| Páprica defumada / paprica / paprika | Outros or wrong | Temperos | Added `paprica defumada`, `paprica`, `paprika` |
| Dill fresco / dill | Outros | Temperos | Added `dill fresco`, `dill` |
| Salsinha fresca / salsinha / parsley | Outros | Temperos | Added `salsinha fresca`, `salsinha`, `parsley` |
| Alecrim fresco / alecrim / rosemary | Outros | Temperos | Added `alecrim fresco`, `alecrim`, `rosemary` |
| Aipo / celery | Hortifruti (celery only) | Hortifruti | Added `aipo` (celery already present) |
| Sementes de chia / chia / chia seeds | Outros | Mercearia | Added `sementes de chia`, `chia seeds`, `chia` |

**Implementation notes:**

- `TEMPEROS_PRIORITY_KEYWORDS` runs before the main section loop so broth/stock items are not misclassified by produce tokens (e.g. `legume` ⊂ `legumes`).
- Within each section, keywords are sorted longest-first so multi-word phrases (e.g. `sementes de chia`) match before shorter tokens (`chia`).

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

1. **Keyword false positives/negatives** — short tokens and bilingual AI names may still misclassify; expand dictionary as real lists appear.  
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
