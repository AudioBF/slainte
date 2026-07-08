# Sláinte

App pessoal de nutrição e compras para quem vive em **Dublin, Irlanda**. Interface em **português (Brasil)**; contexto de supermercados irlandeses.

**Demo (PWA):** [slainte-sigma.vercel.app](https://slainte-sigma.vercel.app)

---

## O que faz

- **Hoje** — acompanhe calorias e macros do dia contra suas metas
- **Refeição** — fotografe o prato; a IA estima nutrientes (editável antes de salvar)
- **Dieta** — gere um cardápio semanal com IA; receitas sob demanda
- **Compras** — lista de compras a partir do plano ou manual, por seção de mercado
- **Mercados** — atalhos para redes na Irlanda (Lidl, Tesco, Dunnes, etc.)
- **Perfil** — metas, restrições, foto e sync opcional na nuvem

> As estimativas de IA são educacionais. O app não substitui orientação médica ou nutricional.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | [Expo SDK 56](https://docs.expo.dev/) + React Native + TypeScript |
| Navegação | Expo Router |
| Estado | Zustand + persist (AsyncStorage) |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| IA | Google Gemini (via Edge Functions) |
| Web / PWA | React Native Web, deploy na Vercel |

---

## Começar

### Pré-requisitos

- Node.js 20+
- npm

### Instalação

```bash
git clone https://github.com/AudioBF/slainte.git
cd slainte
npm install
cp .env.example .env
```

Edite `.env` com suas chaves (veja abaixo). **Nunca commite o arquivo `.env`.**

### Desenvolvimento

```bash
npm start          # Expo dev server
npm run web        # Abrir no navegador
npm run android    # Android (Expo Go / emulador)
npm run ios        # iOS (macOS)
```

### Build web (PWA)

```bash
npm run build:web
```

Saída em `dist/`.

---

## Variáveis de ambiente

Copie de [`.env.example`](.env.example). Valores vazios = modo mock / sem nuvem.

| Variável | Uso |
|----------|-----|
| `EXPO_PUBLIC_AI_MOCK` | `true` (padrão) = dados simulados; `false` = IA real |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave **anon** do Supabase (pública no client) |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `true` = cardápio via Edge Function |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Opcional / legado — preferir Edge + secret no Supabase |

**Segredos que não devem ir no client nem no Git:**

- `GEMINI_API_KEY` — configurar como secret no Supabase (`supabase secrets set`)
- Service role key do Supabase
- Qualquer `.env` com valores reais

Schema do banco: [`supabase/schema.sql`](supabase/schema.sql) (SQL Editor do Supabase).

---

## Scripts úteis

```bash
npm run build:web       # Export web + patch PWA
npm run test:supabase     # Smoke test de conexão Supabase
npm run test:gemini       # Smoke test Gemini (se chave no .env)
npm run generate:icons    # Regenerar ícones PWA
```

---

## Estrutura (resumo)

```
app/           # Rotas Expo Router (tabs, modais)
src/
  components/  # UI compartilhada
  features/    # Auth, dieta, refeição, compras…
  services/    # IA, Supabase, storage
  store/       # Zustand
supabase/      # schema.sql + Edge Functions
```

---

## Segurança e repositório público

- `.env` e `*.env.local` estão no [`.gitignore`](.gitignore)
- Use apenas [`.env.example`](.env.example) como modelo — sem valores reais
- Não commite chaves de API, tokens, dumps de smoke ou builds (`dist/`, `dist-preview-edge/`)
- Documentação operacional interna fica em `docs/private/` (não deve ser publicada)

Se você forkar o projeto, crie **seu próprio** projeto Supabase e configure os secrets lá.

---

## Licença

Ver [LICENSE](LICENSE).
