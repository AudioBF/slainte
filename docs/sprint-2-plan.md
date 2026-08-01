# Plano técnico — Sprint 2 (Tipos de dia e metas dinâmicas)

**Status:** Planejamento apenas — **não iniciado**  
**Base de código:** pós–Sprint 1 (`stable-post-sprint-1` → `dd71b78`)  
**Roadmap:** Tipos de dia e metas dinâmicas  
**Dependência:** Sprint 1 concluído (domínio `nutrition-targets` + defaults Atwater)

---

## 1. Objetivo

Permitir **metas nutricionais diferentes por dia da semana** (e override por data), resolvidas de forma determinística a partir de templates de tipo de dia + agenda semanal, sem quebrar o perfil/legado de meta única.

---

## 2. Escopo

- Modelo de domínio para:
  - templates de tipo de dia (`day_type_templates`);
  - agenda semanal do usuário (`user_weekly_schedule`);
  - override pontual por data (quando o roadmap exigir);
  - resolução `getEffectiveTargetForDate(date) → MacroGoals (+ metadados)`.
- Persistência compatível com o store atual (local primeiro; cloud via blob/`user_sync` ou tabelas novas **só se** o plano de dados for aprovado numa etapa separada).
- UI de agenda semanal (configurar tipo de dia por weekday).
- Migrar “meta padrão” do perfil para fallback quando não houver template/agenda.
- Atualizar **Hoje** e **Semana** para consumir a meta efetiva do dia.
- Atualizar geração/visualização do plano alimentar para a meta do dia (sem exigir Edge nova no primeiro slice).
- Lista de compras: só se o slice exigir recálculo baseado em metas diárias distintas (pode ficar como follow-up se não for necessário no MVP do Sprint 2).

---

## 3. Fora de escopo

- Tabelas `body_*`, peso, Evolução (`/progress`) — Sprint 3+
- Ativar `EXPO_PUBLIC_USE_MACRO_CONSISTENCY=true` em produção
- Publicar Edge Functions novas / breaking
- Validação calórica completa do plano gerado (Sprint posterior do roadmap)
- Fix BL-001 (header Mercados / Abrir perfil)
- Mudanças de RLS/schema em produção sem GO explícito de dados

---

## 4. Arquivos / áreas prováveis

| Área | Caminhos prováveis |
|------|-------------------|
| Domínio | `src/domain/nutrition-targets/` (estender) ou `src/domain/day-targets/` |
| Tipos perfil | `src/features/profile/types.ts` |
| Store | `src/store/useAppStore.ts`, `src/store/selectors.ts` |
| UI agenda | novo componente + possível seção em `app/profile.tsx` ou rota dedicada |
| Hoje / Semana | `app/(tabs)/index.tsx` |
| Dieta | `app/(tabs)/diet.tsx`, `src/services/ai/generate-meal-plan.ts` |
| Persistência | `src/services/storage/`, sync `src/services/supabase/sync.ts` |
| Flag | `src/lib/env.ts`, `.env.example` |
| Testes | Vitest domínio + extensão E2E mínima |
| Docs | `docs/sprint-2-plan.md` (este), arquitetura |

---

## 5. Contratos (propostos)

```ts
type DayTypeId =
  | 'work_long_bike'
  | 'strength_training'
  | 'work_short_bike'
  | 'rest'
  | 'custom';

type DayTypeTemplate = {
  id: string;
  dayType: DayTypeId;
  label: string;
  dailyGoals: MacroGoals; // Atwater-coerente (reusar Sprint 1)
};

type WeeklyScheduleSlot = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // alinhar ao dayIndex existente
  templateId: string;
};

type DateTargetOverride = {
  dateISO: string; // YYYY-MM-DD
  dailyGoals: MacroGoals;
  reason?: string;
};

type EffectiveTarget = {
  dateISO: string;
  dailyGoals: MacroGoals;
  source: 'override' | 'schedule' | 'profile_default';
  templateId?: string;
};
```

Resolução (ordem sugerida):

1. override da data, se existir;
2. template da agenda para o weekday;
3. `profile.dailyGoals` (legado Sprint 1).

Toda meta resolvida deve passar por validação/consistência Atwater do Sprint 1 (ou `resolveConsistentDailyGoals`).

---

## 6. Feature flags

Proposta:

| Flag | Default | Efeito |
|------|---------|--------|
| `EXPO_PUBLIC_USE_DAY_TARGETS` | OFF (ausente ≠ true) | OFF: app continua com meta única do perfil. ON: resolve meta por data. |

Regras:

- Parser explícito no estilo `parseMacroConsistencyFlag` (só `"true"` = ON).
- Não ativar em produção no primeiro merge.
- Flag OFF não remove dados de agenda já salvos (só ignora resolução avançada).

---

## 7. Testes

- Unitários: resolução por override / schedule / fallback; coerência Atwater dos templates default; dias futuros não marcados como “falha” de aderência.
- QA determinística: script tipo `scripts/qa-sprint2-day-targets.mjs`.
- E2E leve (opcional no MVP): abrir agenda, setar dois weekdays distintos, confirmar meta efetiva em Hoje.
- Manter suite Sprint 1 verde (35+ testes / E2E existente).

---

## 8. Critérios de aceite

- Segunda e terça (ou quaisquer dois weekdays) podem ter kcal/macros distintos e coerentes.
- Gráfico / visão semanal mostra metas variáveis por dia.
- Dias futuros **não** contam como falha de aderência.
- Override manual por data funciona e tem precedência clara.
- Histórico de metas efetivas (ou pelo menos das fontes) é preservado — sem apagar `profile.dailyGoals` legado.
- Flag OFF = comportamento idêntico ao pós–Sprint 1.
- Sem migration obrigatória no primeiro slice se a persistência for apenas no blob local/`user_sync` (schema SQL só com GO de dados).

---

## 9. Riscos

| Risco | Mitigação |
|-------|-----------|
| Dupla fonte de verdade (perfil vs agenda) | Fallback documentado; UI deixa claro “meta padrão” vs “meta do dia” |
| Sync blob sobrescrever agenda | Versionar fatia persistida; testes de merge |
| Plano alimentar / Edge ainda assume meta única | Slice 1: só UI+resolução local; Edge depois com flag |
| Usuário não configura agenda | Defaults mapeando goal→templates ou cópia da meta atual para todos os dias |
| Deploy acidental com flag ON | Default OFF; checklist de release |

---

## 10. Rollback

1. Flag OFF (preferencial).
2. `git revert` dos commits do Sprint 2.
3. Baseline conhecido: `stable-post-sprint-1` → `dd71b78`.
4. Se houver schema novo (fase posterior): migrations aditivas + plano de reversão separado.

---

## 11. Dependências do Sprint 1

- `MacroGoals`, defaults Atwater, `validateMacroCalorieConsistency`, `resolveConsistentDailyGoals`, `resolveGoalChangePatch`.
- Modal de objetivo e Perfil já alinhados a uma meta estruturada (não texto livre).
- Flag pattern e E2E harness reutilizáveis.

---

## 12. Ordem sugerida de implementação

1. Tipos + funções puras `getEffectiveTargetForDate` + testes.
2. Persistência local da agenda/templates (store + migrate version).
3. UI mínima de agenda semanal (profile ou tela dedicada).
4. Ligar Hoje à meta efetiva (flag OFF = no-op).
5. Ligar visão Semana / aderência (dias futuros).
6. Override por data.
7. Dieta / gerador (payload com meta do dia; Edge só se necessário e com GO).
8. Script QA + E2E smoke.
9. Docs + checkpoint `stable-pre-sprint-2` antes do merge.

**Não iniciar implementação até GO explícito do Sprint 2.**
