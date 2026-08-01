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
