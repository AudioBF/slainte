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
| Backend | **Supabase** | Auth + PostgreSQL + RLS + `analyze-meal` Edge Function |
| AI | **Google Gemini** (`@google/generative-ai`) | Mixed: meal photo via Supabase Edge Function; meal plan/shopping still client-side |
| Images | **expo-image-picker**, **expo-image** | Camera/gallery; base64 sent to `analyze-meal` Edge Function |
| Fonts | **Fraunces** + **Outfit** (Google Fonts via Expo) | |
| Deploy (web) | **Vercel** | `npm run build:web` → `dist/` |
| Native builds | **EAS** (`eas.json`) | Configured; not primary workflow yet |

### Environment variables (`.env`)

Copy from `.env.example`:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Temporary client-side Gemini key for remaining `generate-meal-plan` and `generate-shopping-list` flows |
| `EXPO_PUBLIC_AI_MOCK` | `"true"` (default) = mock AI; `"false"` = real AI |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

**Security note:** `analyze-meal` now reads `GEMINI_API_KEY` from Supabase Edge Function secrets. `EXPO_PUBLIC_GEMINI_API_KEY` is still temporarily visible in the client bundle because meal plan and shopping list generation have not migrated yet.

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
│   │   └── shopping/         # useShoppingListGenerator
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
- **Hoje:** date navigator, calorie ring, macro bars, meal list for selected date.
- **Semana:** trend chart, planned vs actual comparison, week history.
- FAB “Fotografar refeição” only when today has **zero** meals (otherwise use **+ Nova**).

### Tab: Refeição (`app/(tabs)/meal.tsx`)

Three-step flow: **Foto → Análise → Revisar**

1. Pick slot (breakfast/lunch/dinner/snack).
2. Camera or gallery → `expo-image-picker` (base64).
3. `useMealAnalysis` → `analyze-meal` Supabase Edge Function → Gemini vision → `photoDraft` in store.
4. User edits components/weights; macros recalculate via `applyComponentPatch`.
5. **Registrar no dia** → `confirmPhotoMeal` → navigates to Hoje (resets `selectedHistoryDate` to today).

Can be deep-linked from Dieta with `?slot=&name=&plannedId=`.

### Tab: Dieta (`app/(tabs)/diet.tsx`)

- **Before plan exists:** generator only (goal, restrictions, “Gerar cardápio da semana”).
- **After plan exists:** summary card, day picker (`DayPickerRow` modal), meal cards per day.
- Tap meal → recipe modal if `recipeId` or name match exists.
- **Registrar** / **Fotografar** per planned meal.

### Tab: Compras (`app/(tabs)/shopping.tsx`)

- Progress bar for checked items.
- **Do cardápio** → AI shopping list from `plannedMeals` (requires existing plan).
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
| `selectedDietDay` | 0–6 (Mon–Sun) for Dieta tab |
| `viewMode` | `'today' \| 'week'` on Hoje |
| `markets` | Static supermarket list |
| `lastSyncedAt` | Last successful Supabase sync timestamp |

### Key actions

| Action | Effect |
|---|---|
| `confirmPhotoMeal` | Appends to `loggedMeals`, clears `photoDraft`, sets date to today |
| `logPlannedMeal` | Logs planned meal as today's logged meal |
| `setMealPlan` | Replaces plan + recipes; resets `selectedDietDay` |
| `setShopping` | Replaces shopping list |
| `replacePersistedState` | Full replace (used by cloud sync pull) |
| `completeOnboarding` | Sets profile + clears meals/plan (fresh start) |

### Hydration

`useStoreHydrated()` — returns `true` after AsyncStorage rehydration. Tab layout shows spinner until hydrated, then redirects to onboarding if needed.

### Selectors (`src/store/selectors.ts`)

Pure functions for derived data: `selectMealsForDate`, `selectTodayActual`, `selectWeekCalorieTrend`, `todayISO()`, etc. Prefer selectors over duplicating filter logic in screens.

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
- Edge Functions for meal plan and shopping list AI (meal photo analysis uses `analyze-meal`).
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
        └── generateMealPlan() / generateShoppingList()
                └── generateStructuredJson() (src/services/ai/client.ts)
                        ├── EXPO_PUBLIC_GEMINI_API_KEY (temporary)
                        ├── Model chain per task (primary + fallbacks)
                        ├── JSON schema via Gemini responseSchema
                        ├── Retries + timeout (50s default, 120s meal plan)
                        └── Zod validation on response
```

### Tasks and models (`src/constants/ai.ts`)

| Task | Runtime | Primary model | Timeout |
|---|---|---|---|
| `vision` (meal photo) | Supabase Edge Function `analyze-meal` | `gemini-2.5-flash` | 50s |
| `mealPlan` | Client-side Gemini (temporary) | `gemini-2.5-flash` (Pro if long restrictions) | 120s |
| `shoppingList` | Client-side Gemini (temporary) | `gemini-2.5-flash-lite` | 50s |

Fallback chains in `AI_MODEL_FALLBACKS` remain for client-side tasks. The `analyze-meal` Edge Function has its own copied vision fallback chain under `supabase/functions/_shared/gemini.ts`.

### Prompts

- `src/services/ai/prompts/analyze-meal.prompt.ts`
- `src/services/ai/prompts/meal-plan.prompt.ts`
- `src/services/ai/prompts/shopping-list.prompt.ts`

Meal plan prompt enforces meal-prep variety; `validate-meal-plan.ts` checks repetition rules post-generation.

### User-facing errors

`toAiUserMessage()` in `src/services/ai/errors.ts` maps API failures to Portuguese messages.

### Mock mode

Default: `EXPO_PUBLIC_AI_MOCK=true`. Set to `false` for real AI. Meal photo analysis requires Supabase config, signed-in user, and the Supabase secret `GEMINI_API_KEY`; meal plan/shopping still require `EXPO_PUBLIC_GEMINI_API_KEY` until migrated.

---

## 10. Current limitations

| Area | Limitation |
|---|---|
| **AI security** | Meal photo key is server-side; meal plan and shopping still expose Gemini key until migrated |
| **AI accuracy** | No TACO / Open Food Facts cross-reference; estimates only |
| **Photos** | Not stored in Supabase Storage; no meal photo history |
| **Offline AI** | Requires network for real analysis/generation |
| **Meal plan** | No drag-and-drop; no per-day regeneration |
| **Recipes** | No standalone “Chef IA”; recipes only from plan generation |
| **Shopping** | No aisle grouping, quantity aggregation, or “market mode” |
| **Profile** | No weight/height/age/TDEE calculator |
| **Auth** | Email/password only |
| **Native** | Expo Go incompatible with SDK 56; use web PWA or dev client |
| **Sync** | Last-write-wins-ish via timestamps; not CRDT |
| **i18n** | Portuguese UI only |

---

## 11. Technical debt

| Item | Location / notes |
|---|---|
| Gemini key in client | `analyze-meal` migrated; migrate meal plan and shopping list next |
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

## 12. Features in progress

These are planned or partially done — check git `master` and recent commits before assuming status.

| Feature | Status |
|---|---|
| Design system v2 (tokens, Card variants, motion) | Planned (Sprint 4) |
| Toast / action feedback | Planned |
| Edge Functions for Gemini | In progress — `analyze-meal` deployed; meal plan/shopping pending |
| Chef IA (standalone recipe generator) | Planned |
| Shopping list by supermarket section | Planned |
| Drag-and-drop meal plan | Planned |
| TDEE-based onboarding | Planned |
| UI polish pass (professional tier) | In discussion |

**Recently completed (reference):**

- Cloud sync merge (prevent empty cloud wipe)
- Web layout centering + Android safe area
- Dieta clean UX (generator first, day picker modal, recipe on meal tap)
- AI skeleton loading, `AiBadge`, market logos
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
| Expo Go cannot run project | Info | SDK 56 — use `npm run web` or EAS dev client |

Report new bugs with: platform (web PWA / Android / iOS), steps, screenshot, and whether Supabase login is active.

---

## 14. Next planned features

Prioritized roadmap (product + technical):

### Tier 1 — Near term

1. **Supabase Edge Functions for AI** — hide Gemini key, improve reliability.
2. **Toast + haptic feedback** — register meal, generate plan, sync complete.
3. **Design system v2** — Card/Button variants, tighter hierarchy, basic Reanimated.
4. **Prompt fix: mandatory `recipeId`** on main meals + “Lanche simples” badge.
5. **Shopping: group by aisle** + market mode UI.

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
