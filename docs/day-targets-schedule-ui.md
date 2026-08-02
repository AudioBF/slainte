# Agenda e tipos de dia (Sprint 2B)

## Escopo

Tela de configuração em `/schedule` (entrada pelo Perfil). Permite criar templates de tipo de dia e associá-los aos sete weekdays (segunda=0 … domingo=6).

## Persistência

- Estado: `dayTypeTemplates`, `weeklySchedule` (e `dailyTargetOverrides` intactos do 2A).
- Sync status: `device_local_only` (AsyncStorage / localStorage na web).
- Nenhum dado de day-targets é enviado ao Supabase nesta etapa.
- Troca de usuário continua a limpar day targets (mitigação do 2A).

## Feature flag

`EXPO_PUBLIC_USE_DAY_TARGETS` permanece **OFF**.

A UI `/schedule` existe com a flag OFF. **Sprint 2C** integra Hoje/Semana via selectors centrais quando a flag está ON; Dieta/cardápio permanece mono-meta até o Sprint 2C.3. Ver [day-targets-today-week.md](./day-targets-today-week.md).

## Regras de UI

| Ação | Comportamento |
|------|----------------|
| Agenda | Edição em draft; persistência no store só ao tocar **Salvar agenda**. |
| Template inativo | Não aparece no seletor de dia. |
| Desativar associado | Bloqueado com lista dos dias; sem fallback silencioso. |
| Remover em uso | Confirmação; remove template e limpa associações → meta padrão do perfil. |
| Seed pessoal | Só via **Usar minha rotina atual** + confirmação; pode sobrescrever config existente. |

## Validação

Macros usam o domínio Sprint 1 (`validateMacroCalorieConsistency` / recalcular carbs). Combinações inconsistentes (> tolerância) não são salvas.
