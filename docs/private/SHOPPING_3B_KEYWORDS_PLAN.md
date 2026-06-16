# Shopping 3B — Keyword Dictionary Expansion Plan

**Status:** Planning only. No app code changed.  
**Prerequisite:** Sprint 3A (sections) + Shopping 3C (checked partition) complete.  
**Goal:** Classify more real AI-generated shopping items into the correct supermarket section via local keywords only.

---

## Objective

Reduce **Outros** and wrong-section buckets when users generate lists from real weekly meal plans. Expand `SECTION_KEYWORDS` in `shoppingSections.ts` using patterns observed in mock data, meal-plan prompts, and 3A screenshot fixes — without changing generation, store, or UI layout.

**Success:** A typical 15–25 item generated list has ≤2 items in Outros and no obvious aisle mistakes (e.g. `extrato de tomate` in Hortifruti).

---

## Current behavior

| Piece | Behavior |
|---|---|
| `inferShoppingSection(name)` | Normalized substring match; **first section in fixed order** wins |
| Priority pass | `TEMPEROS_PRIORITY_KEYWORDS` (`caldo`, `stock`, `broth`, …) before main loop |
| Within section | Longest keyword first (`matchesSectionKeywords`) |
| Fallback | `outros` when no keyword matches |
| Persist | Section never stored — computed at render time |

**Section order:** Hortifruti → Proteínas → Laticínios → Mercearia → Temperos → Congelados → Outros.

**Reference lists today:**

- Mock shopping (`src/data/mock.ts`): peito de frango, arroz basmati, brócolis, ovos, espinafre, banana — mostly covered.
- Meal-plan prompt examples: quinoa, massa integral, wrap de peru, salada crua, atum, leguminosas — partially covered.
- 3A tuning already fixed: caldo de legumes, paprica, dill, salsinha, alecrim, aipo, chia.

---

## Problem examples from real lists

Documented misclassifications / gaps (current or likely with AI names):

| Item (as AI might write) | Current / likely | Should be | Root cause |
|---|---|---|---|
| Sal | Outros | Temperos | Only `sal grosso` / `sal marinho` listed |
| Coentro fresco | Outros | Temperos | Herb not in dictionary |
| Cebolinha / cebolinha verde | Hortifruti | Temperos | Substring `cebola` ⊂ `cebolinha` |
| Extrato de tomate | Hortifruti | Mercearia | Substring `tomate` |
| Leite de coco | Laticínios | Mercearia | Substring `leite` |
| Creme de leite de coco | Laticínios | Mercearia | Substring `creme` / `leite` |
| Alho-poró / alho poró | Hortifruti | Hortifruti* | Substring `alho` (*poró is produce — acceptable or add `alho-poro` explicitly) |
| Brócolis congelado | Hortifruti | Congelados | `brocolis` matches before `congelado` |
| Mix de vegetais congelados | Hortifruti or Outros | Congelados | Missing frozen phrases |
| Sementes de linhaça | Outros | Mercearia | Only chia seeded so far |
| Tahine / tahini | Outros | Mercearia | Pantry item |
| Wrap integral / tortilha | Outros | Mercearia | Common meal-prep carb |
| Atum em lata | Proteínas ✓ | Proteínas | OK — verify `atum` wins over bare `lata` if name order differs |
| Tomate cereja | Hortifruti ✓ | Hortifruti | OK via `tomate` |
| Peito de peru | Proteínas ✓ | Proteínas | OK via `peito` + `peru` |
| Molho de soja | Temperos ✓ | Temperos | OK |
| Iogurte grego natural | Laticínios ✓ | Laticínios | OK via `iogurte` |

\*Alho-poró is debatable; treat as Hortifruti unless user feedback says otherwise.

**Process for 3B implementation:** Before coding, export one real generated list (Dieta → Compras → Do cardápio) into the result doc as the regression fixture.

---

## Proposed keyword additions by section

Add normalized-friendly PT + EN tokens. Prefer **multi-word phrases** where substring conflicts exist.

### Hortifruti

`tomate cereja`, `batata doce`, `sweet potato`, `abobora`, `abobora moranga`, `beterraba`, `rabanete`, `rucula`, `agriao`, `alface americana`, `mix de folhas`, `alho poro`, `alho-poro`, `leek`, `cebola roxa`, `red onion`, `abacaxi`, `pera`, `ameixa`, `mirtilo`, `blueberry`, `framboesa`, `maca verde`, `limao tahiti`, `lima`, `pepino japones`, `mini pepino`, `vagem`, `ervilha fresca`, `milho verde`, `milho`, `chuchu`, `nabo`, `gengibre fresco` *(if not overridden to Temperos — see rules)*

### Proteínas

`coxa de frango`, `sobrecoxa`, `sobrecoxa de frango`, `file de frango`, `carne moida`, `ground beef`, `patinho`, `acém`, `maminha`, `contrafilé`, `contrafile`, `salmao fresco`, `salmon fillet`, `file de peixe`, `lata de atum`, `atum enlatado`, `canned tuna`, `sardinha enlatada`, `peito de peru`, `peru fatiado`, `turkey breast`, `presunto`, `ham`, `calabresa`, `peito de porco`, `pork loin`, `camarao descascado`, `shrimp`, `hamburguer`, `burger`, `proteina vegetal`, `seitan`

### Laticínios

`iogurte grego`, `greek yogurt`, `iogurte natural`, `leite desnatado`, `leite semi`, `skim milk`, `cream cheese`, `philadelphia`, `feta`, `gorgonzola`, `provolone`, `emmental`, `cheddar`, `mussarela`, `muçarela`, `queijo ralado`, `parmigiano`, `kefir`, `nata para cozinhar`, `double cream`

**Exclude from Laticínios via priority (Mercearia):** `leite de coco`, `creme de coco` — see rules.

### Mercearia

`massa integral`, `macarrao integral`, `whole wheat pasta`, `wrap`, `wrap integral`, `tortilha`, `tortilla`, `pao integral`, `pao de forma`, `wholemeal bread`, `feijao preto`, `feijao carioca`, `grao de bico`, `lentilha seca`, `split peas`, `extrato de tomate`, `tomato paste`, `polpa de tomate`, `leite de coco`, `coco ralado`, `creme de coco`, `farinha de trigo`, `farinha integral`, `fermento`, `baking powder`, `tapioca`, `amido de milho`, `cornstarch`, `sementes de linhaça`, `linhaça`, `flax`, `flaxseed`, `sementes de girassol`, `nozes`, `walnuts`, `castanha de caju`, `cashew`, `amendoim`, `pasta de amendoim`, `peanut butter`, `tahine`, `tahini`, `aveia em flocos`, `musli`, `muesli`, `bulgur`, `cuscuz marroquino`, `molho de tomate`, `passata`, `enlatado de milho`, `milho enlatado`

### Temperos

`sal fino`, `sal`, `sal refinado`, `pimenta do reino`, `black pepper`, `pimenta calabresa`, `pimenta caiena`, `cayenne`, `colorau`, `acafrao`, `açafrão`, `safrão`, `saffron`, `tomilho`, `thyme`, `louro`, `bay leaf`, `coentro`, `coentro fresco`, `cilantro`, `cebolinha`, `cebolinha verde`, `green onion`, `scalion`, `endro`, `hortelã`, `mint`, `salvia`, `sage`, `curry em po`, `tempero completo`, `tempero baiano`, `shoyu`, `molho ingles`, `worcestershire`, `harissa`, `wasabi`, `missô`, `miso`, `caldo em po`, `cubo de caldo`, `oleo de gergelim`, `sesame oil`

**Priority candidates (before Hortifruti `cebola`):** `cebolinha`, `cebolinha verde`, `coentro fresco`.

### Congelados

Add **priority pass** (like caldo) for frozen phrases before produce loop:

`congelado`, `congelada`, `congelados`, `congeladas`, `frozen`, `brocolis congelado`, `espinafre congelado`, `mix de vegetais congelado`, `vegetais congelados`, `ervilha congelada`, `pizza congelada`, `peixe congelado`, `frutas congeladas`

### Outros

No keyword list — remains fallback. Target: only truly ambiguous or non-food strings land here after 3B.

---

## Rules to avoid bad classification

1. **Multi-word before single-token** — already sorted longest-first; add phrases like `extrato de tomate`, `leite de coco`, `cebolinha verde` before conflicting singles.
2. **Priority passes sparingly** — extend pattern from `TEMPEROS_PRIORITY_KEYWORDS`:
   - `CONGELADOS_PRIORITY_KEYWORDS` — names containing `congelad*` / `frozen` → Congelados before Hortifruti.
   - `MERCEARIA_PRIORITY_KEYWORDS` — `leite de coco`, `creme de coco`, `extrato de tomate`, `polpa de tomate` → Mercearia before Laticínios/Hortifruti.
   - `TEMPEROS_HERBS_PRIORITY` — `cebolinha`, `coentro fresco`, `coentro` → Temperos before Hortifruti `cebola`.
3. **Avoid ultra-short tokens** — do not add bare `sal` without accepting some edge noise; pair with `sal fino`, `sal refinado`, and a careful bare `sal` only if bounded (e.g. exact match helper later — **out of scope for 3B**; use phrase list first).
4. **Do not add bare `legume`** to Hortifruti without caldo priority (already handled).
5. **Do not add bare `lata`** without checking protein canned goods (`lata de atum` phrase in Proteínas).
6. **Regress 3A fixes** — re-run 3A tuning table after every batch.
7. **One file, one PR** — all changes in `shoppingSections.ts` only unless a tiny pure test file is added later (optional, not required for 3B).

---

## Acceptance criteria

- [ ] All items in 3A keyword tuning table still classify correctly.
- [ ] Problem table above: each listed item maps to intended section (or documented exception).
- [ ] Mock shopping list (`mock.ts`) — all 6 items unchanged in section.
- [ ] One real generated list (15+ items): ≤2 in Outros, zero clear aisle errors.
- [ ] No changes to `ShoppingItem`, store, prompts, Edge Functions, or non-shopping screens.
- [ ] `npx tsc --noEmit` and `npm run build:web` pass.

---

## Manual test checklist

| # | Input | Expected section |
|---|---|---|
| 1 | Caldo de legumes | Temperos |
| 2 | Cebolinha fresca | Temperos |
| 3 | Extrato de tomate | Mercearia |
| 4 | Leite de coco | Mercearia |
| 5 | Brócolis congelado | Congelados |
| 6 | Sementes de linhaça | Mercearia |
| 7 | Wrap integral | Mercearia |
| 8 | Peito de frango | Proteínas |
| 9 | Tomate cereja | Hortifruti |
| 10 | Iogurte grego | Laticínios |
| 11 | Coentro | Temperos |
| 12 | Sal | Temperos *(if bare `sal` added)* or Outros *(document choice)* |
| 13 | Item nonsense XYZ | Outros |
| 14 | Regenerate list + spot-check | Sections sensible |
| 15 | Check/uncheck items | 3C partition still works |

---

## Out of scope

- `ShoppingItem` / Zustand / persistence changes  
- AI prompts or shopping generation logic  
- Supabase / Edge Functions  
- Home, Dieta, Refeição, Mercados, Auth, onboarding  
- Collapsible Comprados (3C+)  
- Manual section override UI  
- Persisting inferred section on the item  
- Price / barcode / Tesco-Lidl product matching  
- Full automated test suite (optional small pure-function tests OK in a follow-up)  
- Reordering sections or redesigning Compras UI  

---

## Files likely to inspect

| File | Why |
|---|---|
| `src/features/shopping/shoppingSections.ts` | **Only file to modify** — keywords + priority passes |
| `src/features/shopping/ShoppingSectionList.tsx` | Verify render unchanged |
| `src/data/mock.ts` | Mock shopping regression names |
| `docs/private/SPRINT_3A_SHOPPING_SECTIONS_RESULT.md` | Prior fixes + tuning table |
| `docs/private/SHOPPING_3C_CHECKED_ITEMS_RESULT.md` | Confirm partition unaffected |
| `src/services/ai/prompts/shopping-list.prompt.ts` | Read-only — understand AI naming style |
| `src/services/ai/prompts/meal-plan.prompt.ts` | Read-only — common ingredient vocabulary |
| `supabase/functions/_shared/shopping-list.ts` | Read-only — Edge prompt parity |

---

## Smallest implementation slice

1. Capture one real generated list in `SHOPPING_3B_KEYWORDS_RESULT.md` (during implementation).
2. Add **priority passes**: Congelados, Mercearia (coco/tomato paste), Temperos herbs (cebolinha/coentro).
3. Add **~10–15 high-value keywords per section** from the tables above (not the full dump in one go).
4. Run manual checklist + 3A regression table.
5. Ship; expand dictionary in 3B+ if new lists surface more gaps.

---

*Planning doc only. Implementation starts after review.*
