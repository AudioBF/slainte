# Sláinte

Personal nutrition and grocery planning app built for people living in **Dublin, Ireland**.

The app interface is in **Brazilian Portuguese**, with local context for Irish supermarkets and everyday grocery shopping.

**Live demo (PWA):** [slainte-sigma.vercel.app](https://slainte-sigma.vercel.app)

---

## What it does

- **Today** — track daily calories and macros against personal goals
- **Meal logging** — take a photo of a meal and let AI estimate nutrients before saving
- **Diet planning** — generate a weekly meal plan with AI and request recipes on demand
- **Shopping list** — create grocery lists from the meal plan or manually, grouped by supermarket section
- **Markets** — quick access to Irish supermarket chains such as Lidl, Tesco, Dunnes and Aldi
- **Profile** — manage goals, restrictions, profile photo and optional cloud sync

> AI-generated nutrition estimates are for educational purposes only. This app does not replace medical or nutritional advice.

---

## Technical highlights

- AI-powered meal photo analysis through Supabase Edge Functions
- Editable nutrition estimates before saving meals
- Weekly AI meal planning with on-demand recipes
- Grocery list generation grouped by supermarket section
- Local persistence with Zustand + AsyncStorage
- Optional cloud sync with Supabase Auth and Postgres
- Web/PWA deployment on Vercel

---

## Stack

| Layer | Technology |
|-------|------------|
| App | [Expo SDK 56](https://docs.expo.dev/) + React Native + TypeScript |
| Navigation | Expo Router |
| State | Zustand + persist using AsyncStorage |
| Backend | Supabase Auth, Postgres and Edge Functions |
| AI | Google Gemini via Supabase Edge Functions |
| Web / PWA | React Native Web, deployed on Vercel |

---

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/AudioBF/slainte.git
cd slainte
npm install
cp .env.example .env
```

Edit `.env` with your own keys (see below). **Never commit `.env` to Git.**

### Development

```bash
npm start          # Expo dev server
npm run web        # Run in the browser
npm run android    # Android (Expo Go / emulator)
npm run ios        # iOS (macOS)
```

### Web build (PWA)

```bash
npm run build:web
```

Output is written to `dist/`.

---

## Environment variables

Copy from [`.env.example`](.env.example). Empty values enable mock mode or run without cloud sync.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_AI_MOCK` | `true` (default) = mock data; `false` = real AI |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key (public in the client) |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `true` = meal plan via Edge Function |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Optional / legacy — prefer Edge + Supabase secrets |

**Secrets that must not go in the client or in Git:**

- `GEMINI_API_KEY` — set as a Supabase secret (`supabase secrets set`)
- Supabase service role key
- Any `.env` file with real credentials

Database schema: [`supabase/schema.sql`](supabase/schema.sql) (run in the Supabase SQL Editor).

---

## Useful scripts

```bash
npm run build:web       # Web export + PWA HTML patch
npm run test:supabase   # Supabase connection smoke test
npm run test:gemini     # Gemini smoke test (requires key in .env)
npm run generate:icons  # Regenerate PWA icons
```

---

## Project structure (overview)

```
app/           # Expo Router routes (tabs, modals)
src/
  components/  # Shared UI
  features/    # Auth, diet, meals, shopping, etc.
  services/    # AI, Supabase, storage
  store/       # Zustand
supabase/      # schema.sql + Edge Functions
```

---

## Repository safety (public portfolio)

- `.env` and `*.env.local` are listed in [`.gitignore`](.gitignore)
- Use [`.env.example`](.env.example) only as a template — no real values
- Do not commit API keys, tokens, smoke dumps or build output (`dist/`, `dist-preview-edge/`)
- Internal operational notes belong in `docs/private/` (not published)

To run your own instance, create a **separate** Supabase project and configure secrets there.

---

## License

This repository is shared for **portfolio and demonstration purposes only**. See [LICENSE](LICENSE).
