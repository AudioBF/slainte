# Profile UX Polish v1 — Result

**Date:** 2026-06-28  
**Status:** `PENDING MANUAL SMOKE`  
**Scope:** UX/layout only on the Perfil screen — no store, auth, Edge, IA, schema, env, or other flows.

---

## Objective

Improve the visual and layout quality of the Perfil screen, identified as the weakest area of the app after core flows and Edge Meal Plan reached production stability.

Goals for this sprint:

- Fix misaligned macro goal inputs and awkward `kcal` / `g` labels
- Resolve carbohydrate label overflow on narrow widths
- Stop the sticky “Salvar alterações” bar from overlapping scroll content
- Soften heavy/square cards
- Give the “Mais opções” section more breathing room

Out of scope: Edge Functions, IA, schema, Zustand store, auth, env flags, Meal Plan, Shopping, Receita, Hoje, and Dieta.

---

## Regressions found (2026-06-28 smoke)

| Issue | Symptom |
|---|---|
| Macro grid | Labels/units visually outside bordered areas; `g` floating past card edge on narrow widths (`flexBasis: 46%` + `minWidth: 140` overflow) |
| Sticky save bar | After “Salvar”, screen appeared frozen — touches blocked outside the footer |
| Alterar foto | Unreliable on native without gallery permission; nested `Pressable` on avatar; no `contentFit: cover` on preview |

---

## Patch applied

| File | Change |
|---|---|
| `app/profile.tsx` | Unified macro blocks; docked save bar (no absolute overlay); photo picker permissions + web/native editing split; saved feedback timeout |
| `src/components/Avatar.tsx` | `contentFit="cover"` for centered square preview (one line) |
| `docs/private/PROFILE_UX_POLISH_V1_RESULT.md` | This document |

### Patch details

**Macros:** Each macro is one bordered block (`macroBlock`) containing label + input row + unit. Grid uses `width: '48%'` with `overflow: 'hidden'` and `minWidth: 0` on input — no floating units.

**Save bar / freeze fix:** Replaced `PrimaryActionBar` (absolute `zIndex: 100` overlay) with a **docked footer** in normal flex layout (`ScrollView` + bottom bar sibling). Removes full-screen touch interception on RN Web/Android. `saved` resets after 2.5s.

**Alterar foto:** `requestMediaLibraryPermissionsAsync` on native; `allowsEditing` only when `Platform.OS !== 'web'`; guard against double-tap (`pickingPhoto`); `Avatar` uses `onPress`; loading hint “Abrindo galeria…”.

**Web/PWA limitation:** Square crop UI is not available on web without new dependencies — selection works; preview uses `cover` centering.

---

## PATCH 2 — BACK NAVIGATION FIX (2026-06-28)

| Issue | Symptom |
|---|---|
| “Voltar” em Mais opções | Após “Salvar alterações”, `router.back()` virava no-op ou não saía do Perfil (histórico vazio ou `/profile` direto no PWA); outros itens da lista continuavam funcionando |

| File | Change |
|---|---|
| `app/profile.tsx` | `handleReturnHome()` com `router.replace('/(tabs)')`; `accessibilityLabel="Voltar para Hoje"`; ajuste fino no grid de macros (`flexBasis` + `overflow` na row + larguras fixas de unidade) |

**Causa:** navegação dependente de histórico (`router.back()`). Após salvar ou ao abrir `/profile` diretamente, não havia entrada anterior confiável na pilha.

**Correção:** rota determinística para a aba **Hoje** via `/(tabs)` (default tab `index` = Hoje), mesma convenção de `onboarding.tsx` e `meal.tsx`. Usa `replace` para não reentrar no Perfil com “voltar” do browser.

**Macros (ajuste mínimo):** `gap` no grid, `flexBasis: '47%'` + `minWidth: 0`, `overflow: 'hidden'` na row, unidade com largura fixa (`kcal` 30px / `g` 14px) — reforço do patch 1 em layouts estreitos.

**Status:** ✅ corrigido em `e41fc6d` — smoke manual OK.

---

## PATCH 3 — AVATAR PREVIEW CONFIRMATION FLOW (2026-06-28)

| Issue | Symptom |
|---|---|
| Foto aplicada direto | Após escolher na galeria, avatar mudava imediatamente sem prévia/confirmação |
| Flicker laranja (Hoje) | Ao refresh em Hoje, avatar com foto piscava fundo laranja antes da imagem carregar |

| File | Change |
|---|---|
| `app/profile.tsx` | `draftAvatarUri` + `pendingAvatarUri`; modal de prévia com Cancelar / Trocar foto / Usar foto; persistência só em Salvar; canvas crop no web |
| `src/components/Avatar.tsx` | Fundo sage/cream neutro; sem laranja no ring/fallback com foto; loading placeholder; `transition={0}`; inicial só sem foto |
| `docs/private/PROFILE_UX_POLISH_V1_RESULT.md` | This document |

### Novo fluxo de foto

1. Toque em avatar ou “Alterar foto” → galeria  
2. Escolha da imagem → `pendingAvatarUri` + modal de prévia (não aplica ao perfil)  
3. **Usar foto** → `draftAvatarUri` (visual no Perfil; store inalterado)  
4. **Salvar alterações** → `updateProfile({ avatarUri: draftAvatarUri, … })`  
5. **Cancelar** no modal → descarta pendente; mantém `draftAvatarUri` anterior  
6. **Trocar foto** → reabre galeria sem alterar foto atual  

### Native

- `allowsEditing: true`, `aspect: [1, 1]`, `quality: 0.7`  
- Modal de confirmação **mesmo após** crop nativo da galeria  

### Web/PWA

- Sem crop nativo do picker (`allowsEditing: false`)  
- Modal com prévia circular, pan (↑↓←→ + centralizar) e zoom +/−  
- Ao confirmar, export JPEG quadrado via **canvas** (`exportSquareAvatarWeb`)  
- Ajuste limitado mas funcional; sem nova dependência  

### Flicker laranja

- `ringOnDark` / fallback: laranja removido → **sage** neutro  
- Com URI: placeholder sage/cream enquanto carrega; imagem `opacity: 0` até `onLoad`  
- Letra inicial só quando **não há foto**  

---

## PATCH 4 — REAL AVATAR CROP EXPORT (2026-06-28)

| Issue | Symptom |
|---|---|
| Preview ≠ avatar final | Zoom/pan na prévia não refletiam no avatar; web exportava math diferente da UI (`transform` + `cover` vs canvas) |

| File | Change |
|---|---|
| `app/profile.tsx` | `computeAvatarCropLayout` compartilhado entre prévia e `exportCroppedAvatarUri`; prévia com posicionamento absoluto; export canvas 512×512 JPEG; botão “Aplicando…” |

**Causa:** a prévia usava `contentFit="cover"` + `transform` no wrapper, mas “Usar foto” no web aplicava fórmula de canvas que não correspondia pixel a pixel. No native, URI original do picker era usado (OK sem controles de pan/zoom).

**Correção:** uma única função `computeAvatarCropLayout(imageW, imageH, transform, frameSize)` alimenta:

1. **Prévia** — `Image` posicionada com `width/height/left/top` absolutos dentro da moldura 240×240  
2. **Export web** — mesmo layout escalado para canvas 512×512 → `dataURL` JPEG  

**Native:** sem controles de enquadramento no modal; crop da galeria (`allowsEditing`) + confirmação; URI do picker aplicado ao `draftAvatarUri`.

**Web/PWA:** pan/zoom alteram `PreviewTransform`; “Usar foto” chama `exportCroppedAvatarUri` **antes** de fechar o modal; avatar pequeno recebe JPEG já quadrado/cropado — `Avatar` com `contentFit="cover"` apenas exibe o quadrado final.

---

## Original v1 visual changes (retained)

### Objetivo

- `GoalPicker` (radio-style options with descriptions)

### Cards

- Lighter cards: `radius.xl`, hairline border, no shadow

### Conta e nuvem / Mais opções

- List rows with chevron instead of stacked outline buttons

---

## Explicit non-changes

| Area | Status |
|---|---|
| Zustand store / persist | No change |
| Auth / Supabase sync | No change |
| Edge Functions | No change |
| IA / Gemini prompts / schemas | No change |
| Database schema | No change |
| Env vars (`EXPO_PUBLIC_*`) | No change |
| Meal Plan flow | No change |
| Shopping | No change |
| Receita | No change |
| Hoje (`index.tsx`) | No change |
| Dieta (`diet.tsx`) | No change |
| Business logic (save, macros parsing, onboarding reset) | Unchanged — same handlers and store calls |

---

## Manual validation checklist

- [ ] Open Perfil on **narrow mobile** width
- [ ] **Macros** — each of Calorias / Proteína / Carbs / Gordura: label + value + unit inside same bordered block; no overflow or floating `g`/`kcal`
- [ ] Edit calories, protein, carbs, fat — values update
- [ ] Tap **Salvar alterações** — persists; shows “Salvo ✓” briefly then reverts label
- [ ] **After save, screen does NOT freeze** — scroll, edit fields, open list rows
- [ ] Scroll to bottom — **Mais opções** fully tappable; not covered by save bar
- [ ] Tap **Alterar foto** (link and avatar) — gallery opens on native; web file picker works
- [ ] **Cancelar** no modal de prévia — foto anterior preservada no Perfil
- [ ] **Trocar foto** no modal — reabre galeria sem mudar foto atual até confirmar
- [ ] **Usar foto** — atualiza preview no Perfil (`draftAvatarUri`); store só após **Salvar alterações**
- [ ] Native — crop da galeria + modal de confirmação antes de aplicar
- [ ] Web — pan/zoom na prévia; **avatar no Perfil bate visualmente** com a moldura do modal após “Usar foto”
- [ ] Web — após Salvar + refresh, enquadramento permanece igual
- [ ] “Usar foto” mostra **Aplicando…** e só fecha modal após export
- [ ] **Hoje** — refresh com foto salva: sem flash laranja no avatar do header
- [ ] **Gerenciar conta**, **Sair**, **Mais opções** rows work after save
- [ ] **Voltar** (Mais opções) — antes e depois de salvar; abrindo `/profile` direto no PWA → vai para **Hoje** (`/(tabs)`)
- [ ] Refresh — data persists
- [ ] Web PWA — no post-save freeze; macros layout OK

---

## Automated checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Pass (2026-06-28 patch 4) |
| `npm run lint` | N/A — no lint script in `package.json` |

---

## Notes

- v1 commit: `9306c97` — `fix(profile): polish Perfil layout and macro inputs`
- Patch commit: see `git log -1` on master
- Local `.env` should remain `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`
