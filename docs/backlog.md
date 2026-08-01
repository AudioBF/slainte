# Backlog — itens residuais

Itens fora do escopo das sprints em curso. Não implementar automaticamente.

---

## BL-001 — Clique “Abrir perfil” interceptado na tela Mercados

| Campo | Valor |
|-------|--------|
| **Descrição** | Na tela Mercados, o clique em “Abrir perfil” pode ser interceptado pelo header (elemento não interativo sobreposto), exigindo navegação alternativa (ex.: rota `/profile`). |
| **Severidade** | Baixa |
| **Bloqueante** | Não |
| **Escopo Sprint 1** | Fora — não bloqueou GO de produção |
| **Origem** | Smoke pós-deploy Sprint 1 (Production, 2026-07-30) |
| **Candidato a** | Fix isolado futuro (`fix/markets-profile-header-hit-target` ou similar) |
| **Status** | Aberto |

### Notas

- Demais abas e a rota `/profile` funcionaram no smoke.
- Não misturar esta correção com o Sprint 2 (tipos de dia / metas dinâmicas).

---

## BL-002 — Persistência local pode permanecer após logout / troca de conta

| Campo | Valor |
|-------|--------|
| **Descrição** | Perfil, refeições e demais dados persistidos podem permanecer no AsyncStorage após logout/troca de conta. O store Zustand usa uma chave única por dispositivo, sem isolamento por `user_id`. |
| **Classificação** | Risco pré-existente; segurança / isolamento de sessão |
| **Prioridade** | Média |
| **Bloqueante** | Não |
| **Escopo Sprint 2A** | Fora — o 2A só mitigou day targets na troca de conta (`resetDayTargets`); meals/perfil/compras continuam no padrão antigo |
| **Origem** | Revisão final Sprint 2A (produção `ec52ba3`, 2026-08-01) |
| **Candidato a** | Auditoria específica de sessão + limpeza/scoped storage por usuário (não misturar com Sprint 2B UI de agenda) |
| **Status** | Aberto |

### Notas

- Day targets: na troca de conta, `shouldResetDayTargetsOnUserChange` limpa templates/agenda/overrides locais (mitigação 2A).
- Correção ampla de logout/isolamento exige GO separado e não deve entrar no Sprint 2B.
