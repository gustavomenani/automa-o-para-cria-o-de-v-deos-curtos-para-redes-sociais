# Automacao para Criacao e Postagem em Redes Sociais

## What This Is

Sistema web para automatizar a criacao, montagem, revisao, agendamento e futura publicacao de videos curtos para redes sociais. O produto recebe um prompt, organiza assets de IA ou upload manual, monta um MP4 vertical com audio e legenda, permite revisar/baixar/agendar e prepara a base para Manus, Instagram, TikTok e YouTube.

Este e um projeto brownfield: ja existe um MVP funcional em Next.js App Router com Prisma, PostgreSQL, storage local, FFmpeg, Gemini, Manus parcial e Whisper local. O foco agora e estabilizar o fluxo principal e evoluir para a arquitetura prevista no escopo sem reescrever o que ja funciona.

## Core Value

Transformar um prompt e/ou arquivos de midia em um video vertical pronto para revisao, download e agendamento com o minimo de trabalho manual.

## Requirements

### Validated

- ✓ Usuario pode acessar painel, lista de conteudos, tela de criacao, detalhe/revisao, agenda e configuracoes — existente.
- ✓ Usuario pode criar `ContentProject` com titulo, prompt, tipo de conteudo e legenda — existente.
- ✓ Usuario pode fazer upload manual de multiplas imagens e um audio — existente.
- ✓ Sistema salva metadados de midia no PostgreSQL com Prisma — existente.
- ✓ Sistema salva arquivos em storage local sob `storage/uploads/<projectId>/` — existente.
- ✓ Sistema gera MP4 vertical `1080x1920` com FFmpeg e audio — existente.
- ✓ Sistema queima legenda no video com estilo premium via ASS — existente, mas ainda em ajuste de sincronizacao.
- ✓ Sistema usa Whisper local/faster-whisper para timestamps quando disponivel — existente, mas fragil.
- ✓ Sistema exibe preview, download e historico basico de videos gerados — existente.
- ✓ Sistema permite agendar postagens no banco e exibir agenda — existente.
- ✓ Sistema tem Gemini para gerar plano, texto, imagens/audio quando disponivel e fallback parcial para Manus — existente.
- ✓ Sistema tem `ManusService` estruturado e tela de settings para chave/configuracoes — existente.
- ✓ Sistema possui Docker Compose para PostgreSQL local — existente.

### Active

- [ ] Corrigir de forma confiavel a pipeline de legendas para preservar timestamps do Whisper e texto correto do roteiro sem delay perceptivel.
- [ ] Separar renderizacao/transcricao/chamadas de IA em fila ou worker para evitar request longo e travamento do app.
- [ ] Consolidar Manus como gerador principal de assets quando a API estiver disponivel, mantendo Gemini como opcao/fallback de teste.
- [ ] Implementar login simples e escopo por usuario antes de expor o app fora do ambiente local.
- [ ] Implementar Story vertical como asset separado, com prompt/descricao propria e exportacao.
- [ ] Adicionar status/logs de processamento visiveis no detalhe do conteudo.
- [ ] Adicionar limites de upload, validacao real de arquivo e tratamento de falhas mais robusto.
- [ ] Adicionar testes automatizados para upload, storage, agendamento, exclusao e legendas.
- [ ] Preparar deployment em VPS com Docker para app, Postgres, Redis/fila, FFmpeg e worker.
- [ ] Preparar adaptadores de publicacao/exportacao assistida para Instagram, TikTok e YouTube sem prometer publicacao publica automatica sem credenciais/aprovacoes.

### Out of Scope

- Editor de video com timeline completa — fora do MVP, alto custo e nao e necessario para provar o fluxo.
- Templates ilimitados e personalizacao visual complexa — deve vir depois que o pipeline basico estiver estavel.
- Analytics completo de desempenho das redes sociais — depende de integracoes sociais reais e nao e requisito do primeiro ciclo.
- Multiusuario avancado com permissoes por equipe — login simples e ownership bastam primeiro.
- Automacao por scraping ou meios nao oficiais — viola termos das plataformas e nao deve ser implementada.
- Garantia de publicacao automatica publica em todas as redes — depende de auditoria, permissoes e contas das plataformas.

## Context

O escopo PDF define uma entrega de 10 dias para um MVP com painel, prompts, Manus, video, Stories, agendamento, publicacao/exportacao, historico, deploy e documentacao. O codigo atual ja cobre uma parte relevante dos dias 2, 3, 5, 6, 7 e 8, mas ainda nao cobre autenticao, fila/worker, publicacao real, logs completos, Stories dedicados, deploy final e hardening de seguranca/testes.

O codebase esta organizado como monolito Next.js por dominio:

- `src/app` contem rotas, paginas e API routes.
- `src/features/content` contem fluxo principal de conteudo, uploads, actions e componentes.
- `src/features/video/services/video-service.ts` contem FFmpeg, ffprobe, ASS e integracao com transcricao.
- `src/features/video/services/transcription-service.ts` chama `scripts/transcribe_audio.py`.
- `src/integrations/gemini` e `src/integrations/manus` isolam provedores de IA.
- `src/integrations/social/publisher.ts` ainda e stub.
- `prisma/schema.prisma` ja contem `User`, `ContentProject`, `MediaFile`, `GeneratedVideo`, `ScheduledPost`, `SocialAccount` e `ManusSettings`.

Estado pratico atual: o projeto esta no fim do MVP local/prototipo funcional, entre "gerar video com legenda" e "estabilizar para entrega". A maior dor aberta e legenda sincronizada/texto correto. As maiores lacunas arquiteturais sao fila/worker, auth, limites de upload, logs e publicacao/exportacao social.

## Constraints

- **Tech stack**: manter Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL e FFmpeg — ja implementado e aprovado.
- **Storage**: usar storage local no MVP, mas manter caminho para S3/R2 — requisito do escopo e da implementacao atual.
- **IA**: Manus deve ser a integracao futura/principal do escopo; Gemini pode continuar como teste/fallback, sem remover Manus.
- **Segredos**: nenhuma API key deve ser hardcoded; Gemini via `process.env.GEMINI_API_KEY`, Manus via env ou settings protegidas.
- **Publicacao social**: nao prometer publicacao automatica ate credenciais/permissoes serem validadas; manter fallback de exportacao/download.
- **Runtime**: FFmpeg, ffprobe e Whisper exigem ambiente com processos locais; VPS/Docker e mais adequado que frontend serverless puro.
- **Next.js**: `AGENTS.md` alerta que esta versao do Next tem mudancas relevantes; consultar `node_modules/next/dist/docs/` antes de alteracoes de framework.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manter monolito Next.js por dominio no MVP | Reduz complexidade inicial e acelera entrega | ✓ Good |
| Isolar FFmpeg em `VideoService` | Facilita migrar para worker/fila sem reescrever UI | ✓ Good |
| Usar storage local inicialmente | Simples para validar localmente e em VPS pequena | — Pending |
| Usar ASS para legenda queimada | Da controle visual melhor que `drawtext` simples | ✓ Good |
| Usar Whisper local para timestamps | Melhor sincronismo que dividir legenda pela duracao total | — Pending |
| Nao implementar publicacao social real ainda | APIs dependem de permissao, auditoria e credenciais | ✓ Good |
| Criar mapa de codebase antes do roadmap | Projeto ja tinha codigo e precisava de diagnostico brownfield | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections.
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-21 after initialization from scope PDF and codebase map*
