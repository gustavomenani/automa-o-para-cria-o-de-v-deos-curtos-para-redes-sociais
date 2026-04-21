# Requirements: Automacao para Criacao e Postagem em Redes Sociais

**Defined:** 2026-04-21
**Core Value:** Transformar um prompt e/ou arquivos de midia em um video vertical pronto para revisao, download e agendamento com o minimo de trabalho manual.

## v1 Requirements

### Content

- [ ] **CONT-01**: Usuario pode criar conteudo com titulo, prompt principal, tipo de conteudo e legenda/caption.
- [ ] **CONT-02**: Usuario pode criar conteudo automaticamente a partir de prompt usando um provedor de IA configurado.
- [ ] **CONT-03**: Usuario pode manter o fluxo manual de upload de imagens e audio quando IA falhar ou nao estiver configurada.
- [ ] **CONT-04**: Usuario pode visualizar historico/lista de conteudos por status.
- [ ] **CONT-05**: Usuario pode excluir um conteudo e remover midias, videos e agendamentos relacionados.

### Media

- [ ] **MED-01**: Sistema salva imagens e audio em `storage/uploads/<projectId>/` no MVP.
- [ ] **MED-02**: Sistema registra metadados de imagens, audio, legendas e video no banco via Prisma.
- [ ] **MED-03**: Sistema valida tipos de arquivo aceitos e rejeita formatos invalidos.
- [ ] **MED-04**: Sistema aplica limites de tamanho, quantidade e duracao antes de processar midias.
- [ ] **MED-05**: Sistema prepara contrato de storage para futura migracao a S3/R2 sem reescrever regras de negocio.

### AI Assets

- [ ] **AI-01**: Sistema envia prompt para Manus quando API/chave estiver disponivel e registra tarefa/status.
- [ ] **AI-02**: Sistema baixa/organiza imagens, audio, roteiro, captions e anexos retornados por Manus.
- [ ] **AI-03**: Sistema trata respostas inesperadas, expiradas, incompletas ou que exigem interacao humana.
- [ ] **AI-04**: Sistema usa Gemini apenas como integracao de teste/fallback, sem substituir a estrutura futura de Manus.
- [ ] **AI-05**: Sistema nunca expoe chaves de IA no frontend ou no codigo.

### Video

- [ ] **VID-01**: Sistema gera MP4 vertical `1080x1920` em formato 9:16.
- [ ] **VID-02**: Sistema usa imagens como cenas em tela cheia com crop/ajuste proporcional.
- [ ] **VID-03**: Sistema sincroniza cenas com a duracao real do audio via ffprobe.
- [ ] **VID-04**: Sistema exporta MP4 com H.264/AAC ou formato compativel com redes sociais.
- [ ] **VID-05**: Sistema salva videos gerados em `storage/generated/` e registra `GeneratedVideo`.
- [ ] **VID-06**: Sistema evita corrupcao em geracoes concorrentes para o mesmo projeto.

### Captions

- [ ] **CAP-01**: Sistema gera legenda visual premium sem fundo pesado, com texto branco, contorno preto e margem segura.
- [ ] **CAP-02**: Sistema usa timestamps reais do Whisper quando disponiveis.
- [ ] **CAP-03**: Sistema preserva texto correto do roteiro/caption original sem inventar palavras.
- [ ] **CAP-04**: Sistema evita delay perceptivel entre fala e legenda.
- [ ] **CAP-05**: Sistema cai para sincronizacao aproximada quando Whisper falha, avisando o usuario quando a qualidade for incerta.
- [ ] **CAP-06**: Sistema permite revisar manualmente texto/legenda antes da geracao final quando houver baixa confianca.

### Review

- [ ] **REV-01**: Usuario pode revisar titulo, prompt, status, imagens, audio, legenda e video gerado.
- [ ] **REV-02**: Usuario pode baixar o video final.
- [ ] **REV-03**: Usuario pode gerar novamente o video.
- [ ] **REV-04**: Usuario ve erros e avisos de forma clara sem detalhes internos sensiveis.

### Scheduling

- [ ] **SCH-01**: Usuario pode escolher plataforma, data, horario e caption para agendar.
- [ ] **SCH-02**: Sistema salva `ScheduledPost` no banco e mostra todos os agendamentos em `/schedule`.
- [ ] **SCH-03**: Sistema mostra "Pronto para postar" quando `scheduledAt <= now` e ainda nao houve publicacao.
- [ ] **SCH-04**: Sistema valida que agendamentos novos nao sejam salvos no passado.
- [ ] **SCH-05**: Sistema executa agendamentos via fila/worker quando a publicacao automatica estiver configurada.

### Social

- [ ] **SOC-01**: Sistema possui adaptadores de Instagram, TikTok e YouTube isolados por interface.
- [ ] **SOC-02**: Sistema suporta exportacao assistida/download quando a API da rede nao permitir publicacao automatica.
- [ ] **SOC-03**: Sistema registra status, erro, link publicado ou necessidade de acao manual por plataforma.
- [ ] **SOC-04**: Sistema nao usa scraping ou automacao nao oficial.

### Operations

- [ ] **OPS-01**: Sistema roda localmente com Docker Compose para PostgreSQL.
- [ ] **OPS-02**: Sistema tem caminho de deploy em VPS com Docker, FFmpeg, Python/Whisper e storage persistente.
- [ ] **OPS-03**: Sistema usa fila/worker para IA, transcricao, renderizacao e publicacao.
- [ ] **OPS-04**: Sistema registra logs estruturados de jobs sem expor segredos.
- [ ] **OPS-05**: Sistema tem testes automatizados para os fluxos de maior risco.

### Security

- [ ] **SEC-01**: Sistema possui login simples antes de ficar publico.
- [ ] **SEC-02**: Sistema restringe projetos, arquivos e agendamentos ao usuario dono.
- [ ] **SEC-03**: Sistema protege rotas de mutacao contra abuso com autenticacao e limites basicos.
- [ ] **SEC-04**: Sistema armazena tokens/chaves sensiveis fora do codigo e evita renderizar valores secretos.

## v2 Requirements

### Product

- **PROD-01**: Usuario pode usar biblioteca de templates visuais por nicho.
- **PROD-02**: Usuario pode editar capa e legenda em uma interface dedicada.
- **PROD-03**: Usuario pode planejar calendario editorial mensal.
- **PROD-04**: Usuario pode gerenciar multiplas contas/clientes.
- **PROD-05**: Usuario pode acompanhar analytics de views, curtidas, comentarios e desempenho.
- **PROD-06**: Usuario pode aprovar publicacao por WhatsApp ou e-mail.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editor completo de timeline no navegador | Complexidade alta e nao necessario para MVP |
| Templates ilimitados | Deve vir depois do pipeline basico validado |
| Analytics completo | Depende de integracoes sociais reais e tokens aprovados |
| Multiusuario avancado/equipes | Login simples e ownership sao suficientes no primeiro ciclo |
| Scraping de redes sociais | Viola termos e aumenta risco operacional |
| Garantir aprovacao das APIs sociais | Depende das plataformas, nao do codigo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 1 | Existing, needs hardening |
| CONT-02 | Phase 2 | In Progress |
| CONT-03 | Phase 1 | Existing |
| CONT-04 | Phase 1 | Existing |
| CONT-05 | Phase 1 | Existing |
| MED-01 | Phase 1 | Existing |
| MED-02 | Phase 1 | Existing |
| MED-03 | Phase 1 | Existing, needs hardening |
| MED-04 | Phase 3 | Pending |
| MED-05 | Phase 4 | Pending |
| AI-01 | Phase 2 | In Progress |
| AI-02 | Phase 2 | In Progress |
| AI-03 | Phase 2 | Pending |
| AI-04 | Phase 2 | Existing |
| AI-05 | Phase 2 | Existing |
| VID-01 | Phase 1 | Existing |
| VID-02 | Phase 1 | Existing |
| VID-03 | Phase 1 | Existing |
| VID-04 | Phase 1 | Existing |
| VID-05 | Phase 1 | Existing |
| VID-06 | Phase 3 | Pending |
| CAP-01 | Phase 1 | Existing |
| CAP-02 | Phase 1 | In Progress |
| CAP-03 | Phase 1 | In Progress |
| CAP-04 | Phase 1 | In Progress |
| CAP-05 | Phase 1 | Pending |
| CAP-06 | Phase 3 | Pending |
| REV-01 | Phase 1 | Existing |
| REV-02 | Phase 1 | Existing |
| REV-03 | Phase 1 | Existing |
| REV-04 | Phase 3 | Pending |
| SCH-01 | Phase 1 | Existing |
| SCH-02 | Phase 1 | Existing |
| SCH-03 | Phase 1 | Existing |
| SCH-04 | Phase 3 | Pending |
| SCH-05 | Phase 4 | Pending |
| SOC-01 | Phase 5 | Pending |
| SOC-02 | Phase 5 | Pending |
| SOC-03 | Phase 5 | Pending |
| SOC-04 | Phase 5 | Pending |
| OPS-01 | Phase 1 | Existing |
| OPS-02 | Phase 4 | Pending |
| OPS-03 | Phase 4 | Pending |
| OPS-04 | Phase 4 | Pending |
| OPS-05 | Phase 3 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 3 | Pending |
| SEC-04 | Phase 3 | In Progress |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 after initialization from scope PDF and codebase map*
