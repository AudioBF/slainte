# Encerramento oficial — Sprint 1 (Macro consistency)

**Data:** 2026-08-01  
**Status:** Concluído e aprovado em produção  
**Produção (Vercel):** https://slainte-sigma.vercel.app

---

## Resultado

O Sprint 1 (fonte única de verdade e consistência matemática Atwater entre calorias e macros) foi **concluído**, mergeado em `master`, implantado em Production e validado com smoke pós-deploy **PASS**.

| Item | Valor |
|------|--------|
| Commit de produção | `dd71b782188a93180b8da6f59c2938254dea623b` |
| Merge Sprint 1 | `1e6b36cbb3aedeb871c4256938152bdcb2442101` |
| Commit E2E (cherry-pick em master) | `dd71b782188a93180b8da6f59c2938254dea623b` |
| Feature branch | `feature/sprint-1-macro-consistency` (HEAD histórico `5826102`) |
| Deploy Production | Aprovado (Ready) |
| Smoke pós-deploy | PASS |
| Rollback | Não necessário |

---

## Feature flag

`EXPO_PUBLIC_USE_MACRO_CONSISTENCY`:

- **Produção:** ausente → **OFF**
- Default seguro: apenas `"true"` ativa o bloqueio de save inconsistente
- Funções Atwater, aviso no Perfil e “Recalcular carboidratos” permanecem disponíveis com flag OFF

---

## Validações locais (pré-push / pós-merge)

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | OK |
| Vitest | 35/35 |
| `scripts/qa-sprint1-macro-consistency.mjs` | 14/14 |
| E2E Playwright (`npm run test:e2e:sprint1`) | 10 passed / 6 skipped (cruzamento OFF/ON intencional) |
| `npx expo export --platform web` | OK |

---

## O que não foi alterado

- Nenhuma migration de banco
- Nenhuma alteração de schema / RLS
- Nenhuma Edge Function publicada
- Variáveis remotas Vercel/Supabase não alteradas para ativar a flag

---

## Baselines Git

| Ref | Commit |
|-----|--------|
| `stable-pre-sprint-1` / `backup/stable-pre-sprint-1` | `a263ed28b4abc1b4962f00a196849c4c0af37441` (pré–Sprint 1) |
| `stable-post-sprint-1` / `backup/stable-post-sprint-1` | `dd71b782188a93180b8da6f59c2938254dea623b` (pós–Sprint 1 em produção) |
| `master` / `origin/master` (no encerramento) | `dd71b782188a93180b8da6f59c2938254dea623b` |

### Rollback de emergência (código)

```text
git revert dd71b782188a93180b8da6f59c2938254dea623b
git revert -m 1 1e6b36cbb3aedeb871c4256938152bdcb2442101
git push origin master
```

Preferir, quando bastar, manter a flag OFF (já é o estado de produção).

---

## Entregáveis principais

- Domínio `src/domain/nutrition-targets/` (cálculo, validação, defaults, gate de save, mudança de objetivo)
- Perfil: aviso de inconsistência + recalcular carbs
- Dieta: modal cross-platform de confirmação de objetivo (`GoalChangeConfirmModal`)
- Harness E2E isolado (Playwright) + script `scripts/qa-sprint1-e2e.mjs`
- Docs: arquitetura atual, versionamento, este encerramento

---

## Próximo passo

Ver plano técnico do **Sprint 2 — Tipos de dia e metas dinâmicas** em `docs/sprint-2-plan.md`.  
Risco residual de UI (Mercados / Abrir perfil): `docs/backlog.md`.
