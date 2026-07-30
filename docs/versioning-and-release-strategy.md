# Slainte - Estrategia de Versionamento e Release

**Data:** 2026-07-29
**Contexto:** Documento criado durante a consolidacao do Sprint 1 (macro consistency).
**Branch de origem:** `master` (producao) - commit estavel `a263ed28b4abc1b4962f00a196849c4c0af37441`.

**Nota de formatacao:** este documento evita acentuacao para garantir codificacao estavel em qualquer terminal/editor. O conteudo tecnico permanece integro.

---

## 1. Branches oficiais

| Branch | Papel | Regras |
|---|---|---|
| `master` | Unica fonte de verdade de producao (equivale a `main`). Tudo que esta aqui e considerado "em producao" ou "pronto para deploy". | Nunca commit direto de trabalho experimental. So recebe merge de `feature/*` ou `fix/*` ja validados. Sem force-push. |
| `feature/*` | Desenvolvimento de uma funcionalidade nova ou incremento de escopo (ex.: `feature/sprint-1-macro-consistency`). | Uma branch por entrega logica. Nasce de `master` (ou do commit estavel correspondente). Commits atomicos e descritivos. |
| `fix/*` | Correcao pontual de bug identificado depois de uma feature ja mergeada (ex.: `fix/profile-avatar-crop`). | Mesmo ciclo de vida de `feature/*`, mas com foco em correcao isolada. |
| `backup/*` | Uso **excepcional**. Ponteiro imutavel para um estado estavel especifico, criado antes de uma mudanca de risco (ex.: `backup/stable-pre-sprint-1`). | Nunca recebe commits novos. Serve apenas como ponto de rollback nomeado, alternativa/complemento a tag. |

Nao usamos branch `develop`. Com um unico app mobile/web e pipeline de preview via EAS/Vercel, uma branch de integracao intermediaria adicionaria overhead sem beneficio real neste estagio do produto.

## 2. Convencao de nomes

- `feature/<slug-curto-da-entrega>` - ex.: `feature/sprint-1-macro-consistency`, `feature/shopping-bulk-actions`.
- `fix/<area>-<problema-curto>` - ex.: `fix/meal-plan-edge-timeout`.
- `backup/stable-<contexto>` - ex.: `backup/stable-pre-sprint-1`.
- Tags: `stable-<contexto>` para marcos de auditoria/rollback (ex.: `stable-pre-sprint-1`) ou `vX.Y.Z` (SemVer) quando o app tiver versionamento de release formal para as lojas (App Store/Play Store) ou para o build web.

## 3. Convencao de commits

Formato: `<tipo>(<escopo>): <descricao no imperativo>`

Tipos usados no historico do projeto: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Exemplos reais deste sprint:
- `feat(nutrition): add deterministic macro consistency validation`
- `docs: add versioning and release strategy`

Regras:
- Um commit = uma unidade logica de mudanca. Evitar misturar feature nova com documentacao de processo nao relacionada.
- Mensagem em ingles no historico de codigo (padrao ja usado no repositorio); documentacao de processo pode ser bilingue quando fizer sentido para a equipe.
- Nunca commitar segredos (`.env`, chaves de API, tokens). O `.gitignore` ja cobre `.env`; `.env.example` deve conter apenas nomes de variaveis, nunca valores reais.

## 4. Tags estaveis

Toda vez que um estado e considerado "seguro para voltar" (baseline de producao antes de uma mudanca de risco, ou um release formal), criamos:

1. Uma tag anotada (`git tag -a`) com mensagem explicando o contexto.
2. Opcionalmente uma branch `backup/*` apontando para o mesmo commit, para facilitar navegacao por nome sem depender de lembrar o hash.

Tag criada nesta sessao:

```
stable-pre-sprint-1 -> a263ed28b4abc1b4962f00a196849c4c0af37441
"Slainte stable production baseline before Sprint 1 macro consistency changes"
```

## 5. Preview antes de producao

Fluxo recomendado antes de qualquer merge em `master`:

1. **Local:** `npm run typecheck`, `npm test`, scripts de QA deterministica relevantes (ex.: `scripts/qa-sprint1-macro-consistency.mjs`).
2. **Preview:** build de preview (EAS `preview` profile para mobile, preview deployment do Vercel para o build web) apontando para o Supabase de staging/mesma instancia com dados de teste.
3. **Smoke manual dirigido:** os scripts `scripts/smoke-meal-plan-budget.mjs` e afins so devem ser executados contra o ambiente de preview/producao ja implantado - nunca como parte do processo de commit/rollback, pois fazem chamadas de rede reais a Edge Functions.
4. **GO/NO-GO** (secao 6) antes de promover para producao.
5. **Producao:** merge em `master` + deploy real (EAS `production` profile / build web para producao) - fora do escopo deste documento e desta sessao (nenhum deploy foi executado aqui).

## 6. Criterios GO / NO-GO

**GO** (autorizado a mergear/deployar) quando **todos** os itens abaixo sao verdadeiros:
- `npm run typecheck` sem erros.
- `npm test` com 100% dos testes passando.
- Scripts de QA deterministica da feature (quando existirem) com 100% de passes.
- Nenhum segredo, log, artefato de build ou dado pessoal no diff a ser commitado.
- Feature flag correspondente (quando existir) documentada com comportamento default seguro (ver secao 7).
- Rollback conhecido e testavel (tag/branch estavel ja existe).

**NO-GO** (bloquear e nao avancar) se qualquer item abaixo ocorrer:
- Qualquer teste ou typecheck falhando.
- Diff contendo segredos, `.env`, tokens ou dados sensiveis.
- Mudanca em Edge Function sem plano de rollback do lado servidor.
- Migracao de banco sem script de reversao testado.
- Duvida sobre qual commit e o baseline estavel de producao (parar e auditar antes de prosseguir).

## 7. Feature flags

Padrao adotado no projeto (ver `src/lib/env.ts`): flags via variaveis `EXPO_PUBLIC_*`, com **default seguro = comportamento anterior (OFF)**.

Exemplo desta sprint - `EXPO_PUBLIC_USE_MACRO_CONSISTENCY`:
- Ausente / vazio / qualquer valor que nao seja `"true"` -> `OFF` (comportamento pre-Sprint-1, sem bloqueio).
- `"true"` -> `ON` (bloqueia salvar metas nutricionalmente inconsistentes).

Regra geral: nenhuma feature de risco deve assumir `ON` por ausencia de configuracao. Isso permite:
- Deploy da feature "dormente" em producao sem impacto imediato.
- Ativacao controlada (por ambiente/gradual) sem novo deploy de codigo.
- Rollback instantaneo revertendo apenas a variavel de ambiente, sem precisar reverter commit.

## 8. Rollback - 3 cenarios

### Cenario A - Reverter so o app (codigo ainda nao implantado / implantacao recente sem estado externo afetado)

Quando a mudanca esta apenas em `feature/*` ou acabou de ser mergeada e nenhum dado de producao foi afetado:

```powershell
git checkout master
git revert <hash-do-commit-problematico>
```

Ou, se o deploy ainda nao ocorreu, simplesmente nao promover a branch - `master` permanece no commit estavel (`stable-pre-sprint-1` / `a263ed28b4abc1b4962f00a196849c4c0af37441`).

### Cenario B - Reverter para o baseline estavel conhecido (feature causou regressao em producao)

Usar a tag/branch de backup criada antes da mudanca:

```powershell
git log --oneline stable-pre-sprint-1 -1
git checkout -b hotfix/rollback-sprint-1 stable-pre-sprint-1
```

Revisar o estado, redeployar esse ponto (novo build EAS / novo deploy Vercel) e so entao decidir se `master` deve ser avancado com um revert formal. **Nunca** usar `git reset --hard` em `master` compartilhado - preferir `git revert` ou promover explicitamente o commit estavel atraves de um novo commit/merge.

### Cenario C - Rollback de feature flag (sem tocar em codigo/deploy)

Quando a regressao e comportamental e a feature esta atras de flag (ver secao 7):

1. Alterar `EXPO_PUBLIC_USE_MACRO_CONSISTENCY` (ou equivalente) de volta para `false`/vazio no ambiente de build/preview/producao.
2. Novo build apenas para propagar a variavel (sem mudanca de codigo-fonte).
3. Investigar a causa raiz na branch `feature/*` correspondente sem pressao de producao quebrada.

Este e o caminho preferencial sempre que a feature nova tiver flag - e o rollback mais rapido e mais seguro.

## 9. Migracoes de banco (Supabase)

- Toda migracao em `supabase/schema.sql` ou equivalente deve ser aditiva quando possivel (novas colunas nullable, novas tabelas) para permitir rollback de codigo sem quebrar o schema.
- Migracoes destrutivas (drop/rename de coluna) so devem ocorrer em uma etapa **separada**, apos confirmacao de que nenhum codigo em producao (incluindo builds antigos ainda instalados em dispositivos de usuarios) depende do formato anterior.
- Antes de aplicar, documentar o script de reversao (ou confirmar que a migracao e idempotente/reversivel manualmente).

## 10. Edge Functions

- Mudancas em `supabase/functions/_shared/*` e demais Edge Functions devem ser tratadas como deploy de backend independente do deploy do app - podem exigir rollback proprio (redeploy da versao anterior da funcao) mesmo que o codigo do app ja tenha sido revertido.
- Scripts de smoke test contra Edge Functions (ex.: `scripts/smoke-meal-plan-budget.mjs`) fazem chamadas de rede reais e **nao devem ser executados como parte de um processo de commit/rollback local** - apenas depois de um deploy real, contra o ambiente correspondente.
- Manter compatibilidade retroativa do payload por pelo menos um ciclo de release, ja que clientes antigos podem continuar chamando a funcao por um tempo apos o rollout.

## 11. Checklist de release

Antes de promover `feature/*` -> `master` e deployar:

- [ ] `npm run typecheck` limpo
- [ ] `npm test` 100% passando
- [ ] Scripts de QA deterministica da feature 100% passando
- [ ] Diff revisado - sem segredos, logs, artefatos de build ou dados pessoais
- [ ] Feature flag (se houver) com default seguro documentado
- [ ] Tag/branch de baseline estavel existente para rollback
- [ ] Migracoes de banco (se houver) aditivas ou com plano de reversao
- [ ] Edge Functions (se houver) com plano de rollback proprio
- [ ] Build de preview validado manualmente
- [ ] GO/NO-GO explicito registrado (secao 6)
- [ ] Sem push/merge/deploy automatico - apenas apos aprovacao humana explicita

---

## Anexo - Rastreabilidade desta sessao (Sprint 1 - macro consistency)

| Item | Valor |
|---|---|
| Commit estavel pre-Sprint-1 (`master` == `origin/master`) | `a263ed28b4abc1b4962f00a196849c4c0af37441` |
| Branch de backup | `backup/stable-pre-sprint-1` -> `a263ed28b4abc1b4962f00a196849c4c0af37441` |
| Tag anotada | `stable-pre-sprint-1` -> `a263ed28b4abc1b4962f00a196849c4c0af37441` |
| Branch de feature | `feature/sprint-1-macro-consistency` |
| Commit do Sprint 1 | `feat(nutrition): add deterministic macro consistency validation` (`e153740`) |
| Push/merge/deploy realizado nesta sessao | Nenhum - todas as operacoes permaneceram locais |
