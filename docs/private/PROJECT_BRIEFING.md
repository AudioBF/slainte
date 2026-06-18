# Sláinte — Technical Project Briefing

**Audience:** New developers joining the project  
**Last updated:** June 2026  
**Repo:** https://github.com/AudioBF/slainte  
**Production (web/PWA):** https://slainte-sigma.vercel.app  

This document describes how Sláinte is built today so you can develop safely without breaking core flows.

---

## 1. Product purpose

**Sláinte** is a nutrition app aimed at people living in **Dublin, Ireland**. It helps users:

1. **Track daily intake** — calories and macros (protein, carbs, fat) against personal goals.
2. **Log meals from photos** — AI estimates foods, portions, and macros; users can edit before saving.
3. **Generate a weekly meal plan** — AI creates meal-prep-friendly plans with recipes and daily slots.
4. **Build a shopping list** — generated from the meal plan or added manually.
5. **Find supermarkets** — quick links to Irish chains (Lidl, Tesco, Dunnes, etc.) on Google Maps.

The product loop:

```
Onboard → Set goals → (Optional) Generate diet → Log meals (photo or plan) → Track on Hoje → Shop
```

**Important product constraints:**

- Primary deployment today is **web/PWA on Vercel**, not App Store / Play Store (EAS config exists but store launch is deferred).
- UI copy is **Brazilian Portuguese**; market context is **Irish supermarkets**.
- AI outputs are **estimates**, not medical advice — disclaimers appear in-app.

---

## 2. Current stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Expo SDK 56** + **React Native 0.85** | Single codebase for iOS, Android, web |
| Language | **TypeScript 6** | Strict typing; Zod for AI response validation |
| Navigation | **Expo Router 56** | File-based routing under `app/` |
| State | **Zustand 5** + `persist` middleware | AsyncStorage backend |
| Backend | **Supabase** | Auth + PostgreSQL + RLS + AI Edge Functions |
| AI | **Google Gemini** (`@google/generative-ai`) | Edge Functions for photo/shopping; meal plan Edge path behind feature flag |
| Images | **expo-image-picker**, **expo-image** | Camera/gallery; base64 sent to `analyze-meal` Edge Function |
| Fonts | **Fraunces** + **Outfit** (Google Fonts via Expo) | |
| Deploy (web) | **Vercel** | `npm run build:web` → `dist/` |
| Native builds | **EAS** (`eas.json`) | Configured; not primary workflow yet |

### Environment variables (`.env`)

Copy from `.env.example`:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Temporary client-side Gemini key for meal plan rollback while Sprint 1C is validated |
| `EXPO_PUBLIC_AI_MOCK` | `"true"` (default) = mock AI; `"false"` = real AI |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `"true"` = use `generate-meal-plan` Edge Function; unset/`"false"` = temporary client Gemini rollback path (**production: `false` as of 2026-06-16 — canary rolled back**) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

**Security note:** AI Edge Functions read `GEMINI_API_KEY` from Supabase secrets. `EXPO_PUBLIC_GEMINI_API_KEY` remains temporarily visible in the client bundle only for meal plan rollback while Sprint 1C is validated.

**Production meal plan (2026-06-16):** **Meal Plan Lightweight v1** ✅ — weekly generation returns `plannedMeals` + `summary` only (`recipes: []`). Shopping list uses **`plannedMeals` whenever a plan exists** (Shopping Source Fix v1). **Shopping Quality v1** ✅ — richer plannedMeals prompt + server-side dedupe (~30–50 items). Edge smoke **3/3**, P95 **~33 s**. Production stays `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (client Gemini). **Recipe on demand v1** ✅ — `generate-recipe` Edge + Dieta **Gerar receita** CTA. **Polish v1** ✅. **App stability smoke** ✅ (2026-06-17). See `docs/private/SHOPPING_QUALITY_V1_RESULT.md`, `docs/private/SHOPPING_SOURCE_FIX_RESULT.md`, `docs/private/APP_STABILITY_SMOKE_RESULT.md`, and meal-plan / recipe-on-demand result docs.

### Useful scripts

```bash
npm start              # Expo dev server
npm run web            # Web dev
npm run build:web      # Production web export + PWA HTML patch
npm run test:gemini    # Smoke-test Gemini API
npm run test:supabase  # Smoke-test Supabase connection
npm run generate:icons # Regenerate PWA icons from SVG
```

---

## 3. Folder structure overview

```
slainte/
├── app/                      # Expo Router screens (routes = files)
│   ├── _layout.tsx           # Root layout: fonts, SafeArea, Stack, CloudSyncProvider
│   ├── +html.tsx             # Web HTML shell (PWA meta; partial — see patch-html.mjs)
│   ├── onboarding.tsx        # First-run wizard
│   ├── profile.tsx           # Profile modal
│   ├── account.tsx           # Supabase login/signup modal
│   ├── privacy.tsx           # Privacy modal
│   ├── meal-detail/[id].tsx  # Logged meal detail modal
│   ├── recipe/[id].tsx       # Recipe detail modal
│   └── (tabs)/               # Main tab navigator
│       ├── _layout.tsx       # Tab bar + onboarding gate
│       ├── index.tsx         # Hoje (today dashboard)
│       ├── meal.tsx          # Photo meal logging
│       ├── diet.tsx          # Weekly meal plan
│       ├── shopping.tsx      # Shopping list
│       └── markets.tsx       # Dublin supermarkets
│
├── src/
│   ├── components/           # Shared UI (Button, Card, ScreenHeader, …)
│   ├── constants/            # App config, AI models, meal slots, AI messages
│   ├── data/mock.ts          # Mock data for dev / AI mock mode
│   ├── features/             # Feature hooks & barrel exports
│   │   ├── auth/             # useAuth, useCloudSync, CloudSyncProvider
│   │   ├── diet/             # useMealPlanGenerator
│   │   ├── meal/             # useMealAnalysis
│   │   ├── profile/          # Profile types & defaults
│   │   └── shopping/         # useShoppingListGenerator, shoppingSections, ShoppingSectionList
│   ├── hooks/                # Shared hooks (e.g. useRotatingMessage)
│   ├── lib/                  # env, id, macros, haptics
│   ├── services/
│   │   ├── ai/               # Gemini client, prompts, schemas, generators
│   │   ├── storage/          # AsyncStorage keys
│   │   └── supabase/         # Client, sync, types
│   ├── store/
│   │   ├── useAppStore.ts    # Main Zustand store
│   │   ├── selectors.ts      # Derived data (today, week, dates)
│   │   └── mergePersisted.ts # Cloud/local merge helpers
│   ├── theme/                # colors, typography, tokens
│   └── types/index.ts        # Shared domain types
│
├── supabase/
│   └── schema.sql            # DB schema + RLS (run manually in Supabase SQL Editor)
│
├── scripts/                  # Build & test utilities
├── public/                   # PWA manifest + icons (copied to dist)
├── assets/                   # App icons, brand SVG
├── docs/private/             # Internal docs (this file)
├── vercel.json               # Vercel deploy config
└── eas.json                  # EAS Build profiles
```

**Convention:** Screens live in `app/`; business logic prefers `src/features/` hooks and `src/services/`; UI in `src/components/`.

---

## 4. Main screens and flows

### Navigation map

```
Root Stack
├── (tabs)          ← default after onboarding
├── onboarding      ← redirect if onboardingComplete === false
├── profile         ← modal (avatar tap on Hoje)
├── account         ← modal (Supabase auth)
├── privacy         ← modal
├── meal-detail/[id]← modal
└── recipe/[id]     ← modal
```

### Tab: Hoje (`app/(tabs)/index.tsx`)

- Greeting header with avatar → profile.
- Segmented control: **Hoje** vs **Semana**.
- **Hoje:** date navigator, calorie ring, macro bars, **InsightCard** (primary daily insight), **TodayPlanSection** (next planned meal + one-tap register), meal list for selected date.
- **Semana:** trend chart, **WeekDiagnosisCard** (weekly diagnosis), **Plano × Real** (Seg→hoje via `selectWeekComparison`), week history (rolling 7 days).
- FAB “Fotografar refeição” only when today has **zero** meals and InsightCard is not already showing the photo CTA (dedup polish; otherwise use **+ Nova**).

### Tab: Refeição (`app/(tabs)/meal.tsx`)

Three-step flow: **Foto → Análise → Revisar**

1. Pick slot (breakfast/lunch/dinner/snack).
2. Camera or gallery → `expo-image-picker` (base64).
3. `useMealAnalysis` → `analyze-meal` Supabase Edge Function → Gemini vision → `photoDraft` in store.
4. User edits components/weights; macros recalculate via `applyComponentPatch`.
5. **Revisar:** sticky `PrimaryActionBar` (**Registrar no dia**); documented `REVIEW_FOOTER_SPACE` scroll clearance; iOS `KeyboardAvoidingView` when editing.
6. **Registrar no dia** → `confirmPhotoMeal` → navigates to Hoje (resets `selectedHistoryDate` to today).

Can be deep-linked from Dieta with `?slot=&name=&plannedId=`.

### Tab: Dieta (`app/(tabs)/diet.tsx`)

- **Before plan exists:** generator only (goal, restrictions, “Gerar cardápio da semana”).
- **After plan exists:** summary card, day picker (`DayPickerRow` modal), meal cards per day.
- Day picker defaults to **today** (`todayDayIndex()`); today’s row shows **(Hoje)**.
- Tap meal → recipe modal if `recipeId` or name match exists.
- **Registrar** / **Fotografar** per planned meal — **only when selected day is today** and meal **not yet logged**; other days are view-only (recipe still tappable after register).

### Tab: Compras (`app/(tabs)/shopping.tsx`)

- Progress bar for checked items.
- List grouped by **supermarket section** (Hortifruti, Proteínas, Laticínios, Mercearia, Temperos, Congelados, Outros) via local keyword inference at render time — `ShoppingItem` shape unchanged.
- Checked items render at the **bottom of each section** (view-only partition); section headers show **restantes** when the section has checked items.
- **Marcar todos** / **Desmarcar todos** — bulk check/uncheck entire list (`setAllShoppingChecked`); **Limpar marcados** removes checked items (unchanged).
- **Do cardápio** → AI shopping list from `plannedMeals` when a plan exists (Quality v1: week-wide consolidated list, ~30–50 items; `recipes` fallback only if no plan).
- Manual add/remove; collapsible add form.

### Tab: Mercados (`app/(tabs)/markets.tsx`)

- Static list from `mockMarkets` in store; opens Google Maps search.

### Onboarding (`app/onboarding.tsx`)

3 steps: name → goal → restrictions → `completeOnboarding()` → tabs.

### Profile / Account

- **Profile:** edit name, goals, macros, avatar, cloud sync status, redo onboarding.
- **Account:** email/password sign-in or sign-up via Supabase.

---

## 5. Zustand stores

There is **one global store:** `useAppStore` in `src/store/useAppStore.ts`.

### Persisted slice (synced to AsyncStorage + Supabase)

| Field | Type | Description |
|---|---|---|
| `profile` | `UserAccount` | User identity, goals, macros, onboarding flag |
| `loggedMeals` | `LoggedMeal[]` | Meals logged by date |
| `plannedMeals` | `PlannedMeal[]` | AI weekly plan slots |
| `recipes` | `Recipe[]` | Recipes from meal plan generation |
| `shopping` | `ShoppingItem[]` | Shopping list |
| `mealPlanSummary` | `string \| null` | AI summary text for current plan |
| `selectedHistoryDate` | `string` | ISO date (`YYYY-MM-DD`) for Hoje view |

Storage key: `@slainte/app-state/v1` (`STORAGE_KEYS.appState`).  
Persist version: `APP.storageVersion` (= 2) with migrate logic in store config.

### Ephemeral / session state (not persisted)

| Field | Description |
|---|---|
| `photoDraft` | In-progress meal analysis components |
| `selectedDietDay` | 0–6 (Mon–Sun) for Dieta tab; defaults to calendar today (ephemeral) |
| `viewMode` | `'today' \| 'week'` on Hoje |
| `markets` | Static supermarket list |
| `lastSyncedAt` | Last successful Supabase sync timestamp |

### Key actions

| Action | Effect |
|---|---|
| `confirmPhotoMeal` | Appends to `loggedMeals`, clears `photoDraft`, sets date to today; skips duplicate `plannedMealId` for today |
| `logPlannedMeal` | Logs planned meal as today's logged meal (rejects if `meal.dayIndex` ≠ today) |
| `setMealPlan` | Replaces plan + recipes; resets `selectedDietDay` to today |
| `setShopping` | Replaces shopping list |
| `replacePersistedState` | Full replace (used by cloud sync pull) |
| `completeOnboarding` | Sets profile + clears meals/plan (fresh start) |

### Hydration

`useStoreHydrated()` — returns `true` after AsyncStorage rehydration. Tab layout shows spinner until hydrated, then redirects to onboarding if needed.

### Selectors (`src/store/selectors.ts`)

Pure functions for derived data: `selectMealsForDate`, `selectTodayActual`, `selectWeekCalorieTrend`, `todayISO()`, `todayDayIndex()`, `isoToDayIndex()`, etc. Prefer selectors over duplicating filter logic in screens.

---

## 6. Supabase architecture

```
┌─────────────────────────────────────┐
│  App (Expo / Web)                    │
│  Zustand store ←→ AsyncStorage       │
└──────────────┬──────────────────────┘
               │ @supabase/supabase-js
               │ (auth + REST)
┌──────────────▼──────────────────────┐
│  Supabase                            │
│  • Auth (email/password)             │
│  • PostgreSQL (profiles, user_sync)  │
│  • RLS: user sees only own rows      │
└─────────────────────────────────────┘
```

### Client (`src/services/supabase/client.ts`)

- Singleton Supabase client.
- Auth session stored in AsyncStorage.
- Returns `null` if env vars missing (`hasSupabase()` false) — app works offline/local-only.

### Sync (`src/services/supabase/sync.ts`)

Mounted via `CloudSyncProvider` → `useCloudSync()`:

1. **On sign-in:** `syncWithCloud(userId)` — pull if cloud newer, else push.
2. **On local changes:** debounced (2.5s) `pushToCloud(userId)`.

Merge rules (`src/store/mergePersisted.ts`):

- Never overwrite local meals with empty cloud data.
- Profile fields merged (keep local `displayName` if cloud empty).
- Arrays use “richer” set (more items wins).

### What is NOT in Supabase yet

- Meal photos (no Storage integration).
- Normalized relational tables for meals/recipes (JSON blobs only).
- Meal plan **Lightweight v1** deployed (planned meals only; `recipes: []` on new generations). **Production uses client Gemini** (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`).
- Apple/Google OAuth.

---

## 7. Database schema summary

Defined in `supabase/schema.sql`. Run once in Supabase SQL Editor.

### `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id` |
| `display_name` | `text` | |
| `avatar_uri` | `text` | Local URI today; not Supabase Storage URL |
| `goal` | `text` | `lose` \| `maintain` \| `gain` |
| `restrictions` | `text` | Free-text dietary preferences |
| `daily_goals` | `jsonb` | `{ calories, protein, carbs, fat }` |
| `onboarding_complete` | `boolean` | |
| `updated_at` | `timestamptz` | Used for sync conflict resolution |

### `public.user_sync`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK | FK → `auth.users.id` |
| `logged_meals` | `jsonb` | Array of `LoggedMeal` |
| `planned_meals` | `jsonb` | Array of `PlannedMeal` |
| `recipes` | `jsonb` | Array of `Recipe` |
| `shopping` | `jsonb` | Array of `ShoppingItem` |
| `meal_plan_summary` | `text` | |
| `selected_history_date` | `text` | ISO date string |
| `updated_at` | `timestamptz` | Sync timestamp |

### RLS

Both tables have SELECT/INSERT/UPDATE policies scoped to `auth.uid()`.

### Trigger

`on_auth_user_created` — auto-inserts empty `profiles` + `user_sync` rows on signup.

**Schema debt:** `user_sync_update_own` policy is duplicated in `schema.sql` (lines 44–48); harmless but should be cleaned up.

---

## 8. Authentication flow

```
User opens Account (profile → "Entrar")
        │
        ▼
signInWithEmail / signUpWithEmail  (src/features/auth/useAuth.ts)
        │
        ▼
Supabase Auth session → persisted in AsyncStorage
        │
        ▼
useCloudSync detects isSignedIn + user.id
        │
        ├── First login: syncWithCloud() — merge or push local data
        └── Ongoing: debounced pushToCloud on store changes
```

- **Without Supabase configured:** auth UI explains missing env; app remains fully local.
- **Sign out:** `signOut()` clears Supabase session; local Zustand data remains on device.
- **No social login** (Apple/Google) yet.

---

## 9. AI / Gemini architecture

```
Screen hook (useMealAnalysis / useMealPlanGenerator / useShoppingListGenerator)
        │
        ▼
Service (analyze-meal-photo | generate-meal-plan | generate-shopping-list)
        │
        ├── if aiMock → mock data + delay
        │
        ├── analyzeMealPhoto()
        │       └── supabase.functions.invoke('analyze-meal')
        │               └── Edge Function reads GEMINI_API_KEY secret and calls Gemini vision
        │
        ├── generateShoppingList()
        │       └── supabase.functions.invoke('generate-shopping-list')
        │               └── Edge Function reads GEMINI_API_KEY secret and calls Gemini text
        │
        └── generateMealPlan()
                ├── if EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true
                │       └── supabase.functions.invoke('generate-meal-plan')
                │               └── Edge Function runs prompt, Gemini, schema validation, variety retry loop
                │
                └── else temporary rollback path
                        └── generateStructuredJson() (src/services/ai/client.ts)
                                └── EXPO_PUBLIC_GEMINI_API_KEY
```

### Tasks and models (`src/constants/ai.ts`)

| Task | Runtime | Primary model | Timeout |
|---|---|---|---|
| `vision` (meal photo) | Supabase Edge Function `analyze-meal` | `gemini-2.5-flash` | 50s |
| `mealPlan` | Supabase Edge Function `generate-meal-plan` behind feature flag; client fallback temporary | `gemini-2.5-flash` (Pro if long restrictions) | 120s |
| `shoppingList` | Supabase Edge Function `generate-shopping-list` | `gemini-2.5-flash-lite` | 50s |

Fallback chains exist in both the temporary client meal plan path and the Edge Function helper under `supabase/functions/_shared/gemini.ts`.

### Prompts

- `src/services/ai/prompts/analyze-meal.prompt.ts`
- `src/services/ai/prompts/meal-plan.prompt.ts`
- `src/services/ai/prompts/shopping-list.prompt.ts`

Meal plan prompt enforces meal-prep variety; `validate-meal-plan.ts` checks repetition rules post-generation.

### User-facing errors

`toAiUserMessage()` in `src/services/ai/errors.ts` maps API failures to Portuguese messages.

### Mock mode

Default: `EXPO_PUBLIC_AI_MOCK=true`. Set to `false` for real AI. Edge AI requires Supabase config, signed-in user, and the Supabase secret `GEMINI_API_KEY`. Meal plan uses Edge only when `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`; otherwise it still uses `EXPO_PUBLIC_GEMINI_API_KEY` as a temporary rollback path.

---

## 10. Current limitations

| Area | Limitation |
|---|---|
| **AI security** | Meal plan still keeps a temporary public Gemini key for rollback until Edge validation is complete |
| **AI accuracy** | No TACO / Open Food Facts cross-reference; estimates only |
| **Photos** | Not stored in Supabase Storage; no meal photo history |
| **Offline AI** | Requires network for real analysis/generation |
| **Meal plan / week view** | Plano × Real uses Seg→hoje (2D); trend/histórico still rolling 7 days (2D+); no drag-and-drop |
| **Recipes** | No standalone “Chef IA”; recipes only from plan generation |
| **Shopping** | Sections (3A), keywords (3B), checked-item ordering (3C), bulk mark/unmark (3D) done; no quantity aggregation, collapsible “Comprados”, per-section bulk, multi-select, market mode, manual section override, or product/price matching |
| **Profile** | No weight/height/age/TDEE calculator |
| **Auth** | Email/password only |
| **Native** | Expo Go incompatible with SDK 56; use web PWA or dev client |
| **Sync** | Last-write-wins-ish via timestamps; not CRDT |
| **i18n** | Portuguese UI only |

---

## 11. Technical debt

| Item | Location / notes |
|---|---|
| Gemini key in client | All Edge paths implemented; remove public key only after meal plan Edge path is validated in production |
| JSON blob sync vs normalized DB | Hard to query; large payloads |
| Duplicate RLS policy in schema | Fixed in Sprint 1A |
| `+html.tsx` PWA meta not applied on export | Workaround: `scripts/patch-html.mjs` post-build |
| Outfit_700Bold referenced but not loaded | Used in `MarketLogo`; falls back silently |
| No TanStack Query | Manual sync/subscribe patterns |
| No automated tests | Manual smoke scripts only |
| No Sentry / crash reporting | ErrorBoundary only |
| Cloud sync errors swallowed | `.catch(() => undefined)` in useCloudSync |
| `completeOnboarding` wipes all meals/plan | Intentional but surprising |
| PWA cache | Users must re-add shortcut after icon/layout changes |

---

## 12. Sprint status & backlog

Check git `master` and recent commits before assuming status.

### Completed

**Sprint 2 — Smart Home** ✅

| Slice | Delivered |
|---|---|
| **2A InsightCard** | Primary daily insight on Hoje (on-track, over goal, empty day, etc.) |
| **2B TodayPlanSection** | Next planned meal for today + one-tap register |
| **2C WeekDiagnosisCard** | Weekly diagnosis on Semana tab |
| **2P Home dedup polish** | Hide FAB when InsightCard shows photo CTA; skip redundant plan-pending insight |

Docs: `docs/private/SPRINT_2_*`

**Sprint 3A — Shopping Sections** ✅

| Delivered | Notes |
|---|---|
| Shopping list grouped by supermarket sections | Hortifruti → … → Outros; empty sections hidden |
| Local keyword inference | PT-BR + EN substring rules; section computed at render time |
| No persisted data shape change | `ShoppingItem` and Zustand store unchanged; no AI / Edge changes for grouping |

Docs: `docs/private/SPRINT_3A_SHOPPING_SECTIONS_*`

**Shopping 3C — Checked Items UX** ✅

| Delivered | Notes |
|---|---|
| Checked items at bottom of each section | View-only `partitionShoppingByChecked()`; store array order unchanged |
| Section header remaining count | `{label} · {n} restantes` when section has checked items |
| No persisted data shape change | `ShoppingItem`, Zustand store, persistence, AI, and Edge paths unchanged |

Docs: `docs/private/SHOPPING_3C_CHECKED_ITEMS_*`

**Shopping 3D — Bulk actions** ✅

| Delivered | Notes |
|---|---|
| **Marcar todos** / **Desmarcar todos** | Global bulk check/uncheck in progress card |
| `setAllShoppingChecked(checked)` | Idempotent; no array reorder; `ShoppingItem` shape unchanged |
| **Limpar marcados** unchanged | Still removes checked items (not uncheck) |

Docs: `docs/private/SHOPPING_3D_BULK_ACTIONS_*`

**Shopping 3B — Keyword dictionary** ✅

| Delivered | Notes |
|---|---|
| Priority passes | Congelados, Mercearia pantry phrases, Temperos herbs (plus existing caldo pass) |
| Expanded keyword set | ~10–15 high-value PT/EN terms per section in `shoppingSections.ts` |
| Safety polish | Exact-only bare `sal`; no bare `gelado`/`gelada`; no generic `lata` |
| No persisted data shape change | Render-time inference only; 3A/3C behavior preserved |

Docs: `docs/private/SHOPPING_3B_KEYWORDS_*`

**Sprint 2D — Plano × Real by calendar day** ✅

| Delivered | Notes |
|---|---|
| Week-to-date comparison | **Plano × Real** uses Segunda → hoje for both planned and actual macros |
| Selector-only | `isoToDayIndex`, `selectWeekToDateDates`, `selectPlannedForDate` in `selectors.ts` |
| No persisted data shape change | `PlannedMeal.dayIndex` mapping at render time; no `planWeekStart` field |

Docs: `docs/private/SPRINT_2D_PLAN_VS_ACTUAL_*`

**Meal review sticky footer polish** ✅

| Delivered | Notes |
|---|---|
| Documented Revisar footer spacing | `REVIEW_FOOTER_SPACE` replaces magic `88 + 64` in `meal.tsx` |
| iOS keyboard avoidance | `KeyboardAvoidingView` on Revisar only; Android/web unchanged |
| No business logic change | `confirmPhotoMeal`, `photoDraft`, component editing unchanged |

Docs: `docs/private/MEAL_REVIEW_STICKY_FOOTER_POLISH_*`

**Toast + haptic feedback v1** ✅

| Delivered | Notes |
|---|---|
| Global feedback host | `ToastProvider` wired once in `app/_layout.tsx` |
| Success-only milestone feedback | Meal register, planned meal register, meal plan generated, shopping list generated |
| Lightweight behavior | One toast at a time, auto-dismiss, no queue/persistence; no business logic or persisted shape changes |

Docs: `docs/private/TOAST_HAPTICS_*`

**Diet day alignment** ✅

| Delivered | Notes |
|---|---|
| Opens on today | Dieta `selectedDietDay` defaults to `todayDayIndex()`; `setMealPlan` resets to today |
| “Hoje” label | `DayPickerRow` shows e.g. `Terça-feira (Hoje)` |
| Non-today blocked | Registrar/Fotografar disabled off-today; hint *Registro disponível apenas para o dia de hoje.* |
| Store guard | `logPlannedMeal` rejects `meal.dayIndex !== todayDayIndex()` |

Docs: `docs/private/DIET_DAY_ALIGNMENT_*`

**Diet planned photo dedup** ✅

| Delivered | Notes |
|---|---|
| Fotografar gated | Disabled when planned meal already logged today (`logged \|\| !canRegisterToday`) |
| Store integrity | `confirmPhotoMeal` rejects duplicate `plannedMealId` for `todayISO()` |
| Recipe preserved | Post-register recipe tap unchanged |

Docs: `docs/private/DIET_PLANNED_PHOTO_DEDUP_*`

### Known backlog (next work)

| Item | Description |
|---|---|
| **Recipe on demand** ⭐ | ✅ v1 — `generate-recipe` Edge + **Gerar receita** on Dieta when user wants preparation details |
| **Design system v2** | Tokens, Card/Button variants, tighter hierarchy, basic Reanimated |
| **TDEE onboarding** | Calculator in onboarding/profile |

**UX / design polish (optional):**

| Item | Description |
|---|---|
| **Disabled Fotografar styling** | Stronger muted/disabled visual when meal already registered |
| **Histórico kcal labels** | Suffix `kcal` on weekly history day totals (Hoje, Ontem, …) |
| **Plano × Real percentages** | Show % of plan beside Real values in week comparison |

**Other optional follow-up:**

| Item | Description |
|---|---|
| **Shopping 3D+** | Multi-select, per-section bulk, bulk remove selected |
| **Shopping 3C+** | Collapsible per-section **Comprados** if real shopping tests still feel noisy |
| **Sprint 2D+** | Align TrendChart / Histórico to calendar week (or add copy) — Plano × Real already Seg→hoje |

### Other planned (not started)

| Feature | Status |
|---|---|
| Design system v2 (tokens, Card variants, motion) | Planned (Sprint 4) |
| Chef IA (standalone recipe generator) | Planned |
| Drag-and-drop meal plan | Planned |
| TDEE-based onboarding | Planned |
| UI polish pass (professional tier) | In discussion |

**Recently completed (reference):**

- Sprint 2 Smart Home (InsightCard, TodayPlanSection, WeekDiagnosisCard, dedup polish)
- Sprint 3A Shopping Sections (section grouping + keyword tuning)
- Shopping 3D Bulk actions (Marcar todos / Desmarcar todos; setAllShoppingChecked)
- Shopping 3C Checked Items UX (view-only partition; restantes headers)
- Shopping 3B Keyword dictionary (priority passes + safety polish)
- Sprint 2D Plano × Real (Seg→hoje week comparison)
- Meal review sticky footer polish (Revisar spacing + iOS keyboard)
- Toast + haptic feedback v1 (global ToastProvider, success-only actions)
- Diet day alignment (Dieta opens on today; non-today registration blocked)
- Diet planned photo dedup (Fotografar disabled when logged; store duplicate guard)
- Cloud sync merge (prevent empty cloud wipe)
- Web layout centering + Android safe area
- Dieta clean UX (generator first, day picker modal, recipe on meal tap)
- AI skeleton loading, `AiBadge`, market logos
- Edge Functions: `analyze-meal` and `generate-shopping-list` deployed with auth hardening
- Meal plan timeout increased to 120s

---

## 13. Known bugs

| Bug | Severity | Notes |
|---|---|---|
| Not all planned meals get `recipeId` | Medium | Snacks/simple meals often lack recipe link; AI inconsistency |
| Generic AI error message | Low | Some failures still show fallback text; check console in dev |
| Meal plan generation slow (30–90s) | Medium | Expected; UI shows skeleton; user must wait |
| `recipeId` name matching fragile | Medium | Fallback matches recipe by exact name |
| PWA stale cache after deploy | Medium | Users may need hard refresh / re-install shortcut |
| Avatar broken if invalid `avatarUri` | Low | Fixed with `onError` fallback — verify on device |
| Viewing “Ontem” hides new meals | Low | Fixed: confirm resets to today; banner if viewing past date |
| Dieta/Home day mismatch | Medium | Fixed: Dieta defaults to today; non-today Registrar blocked |
| Expo Go cannot run project | Info | SDK 56 — use `npm run web` or EAS dev client |

Report new bugs with: platform (web PWA / Android / iOS), steps, screenshot, and whether Supabase login is active.

---

## 14. Next planned features

Prioritized roadmap (product + technical):

### Tier 1 — Near term

1. **Recipe on demand v2** — regenerate alternate recipe, optional Edge cache.
2. **Design system v2** — Card/Button variants, tighter hierarchy, basic Reanimated.
3. **TDEE-based onboarding** — calculator in onboarding/profile.
4. **Prompt fix: mandatory `recipeId`** on main meals + “Lanche simples” badge.

**UX polish (optional):** disabled **Fotografar** styling; **kcal** suffix on Histórico week totals; **%** labels on Plano × Real.

**Other optional follow-up:** **Shopping 3D+** — multi-select / per-section bulk; **Shopping 3C+** — collapsible per-section **Comprados**; **Sprint 2D+** — align TrendChart/Histórico to calendar week.

### Tier 2 — Medium term

6. **Chef IA** — on-demand recipe generation with filters + saved library.
7. **Meal plan drag-and-drop** — reorder between days/slots.
8. **Auto-update shopping list** when plan changes.
9. **TDEE calculator** in onboarding/profile.
10. **Photo upload** to Supabase Storage.

### Tier 3 — Future

11. Nutritional database cross-reference (TACO / Open Food Facts).
12. Apple / Google sign-in.
13. Sentry monitoring.
14. Dark mode.
15. App Store / Play Store release via EAS.

---

## Quick start for developers

```bash
git clone https://github.com/AudioBF/slainte.git
cd slainte
npm install
cp .env.example .env   # fill in keys
npm run web            # recommended for development
```

**Before your first PR:**

1. Read this briefing + skim `src/store/useAppStore.ts` and `src/services/ai/client.ts`.
2. Run `npm run test:gemini` if touching AI code.
3. Run `npx tsc --noEmit` before committing.
4. For web changes, run `npm run build:web` and spot-check layout.
5. Do not commit `.env` or API keys.

**Safe areas to change:** UI components, copy, prompts, selectors.  
**Change with care:** `useAppStore` persist shape, sync merge logic, AI schemas (breaks validation).  
**Coordinate before changing:** Supabase schema, env var names, storage version migrations.

---

## Key contacts & links

| Resource | URL |
|---|---|
| GitHub | https://github.com/AudioBF/slainte |
| Live app | https://slainte-sigma.vercel.app |
| Expo SDK docs | https://docs.expo.dev/versions/v56.0.0/ |
| Gemini API | https://aistudio.google.com/ |
| Supabase dashboard | Project-specific (see team credentials) |

---

*This is an internal document. Do not commit secrets. Update this file when architecture or flows change materially.*
