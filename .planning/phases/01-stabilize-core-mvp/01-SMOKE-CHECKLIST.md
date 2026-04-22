# Phase 1 Smoke Checklist

Checklist local para validar o MVP principal depois dos ajustes de legenda, feedback e documentacao.

## Pre-requisitos

- `.env` configurado localmente, sem expor valores neste arquivo.
- PostgreSQL iniciado com Docker Compose: `docker compose up -d`.
- Prisma pronto: `npm run prisma:generate` e `npm run prisma:deploy`.
- FFmpeg e ffprobe disponiveis no PATH ou via `FFMPEG_PATH` / `FFPROBE_PATH`.
- Whisper opcional instalado com `python -m pip install -r requirements-whisper.txt`.
- Gemini/Manus opcionais somente se a chave estiver no `.env` ou `/settings`.

## Comandos automaticos

```bash
npm test -- --run src/features/video/services/caption-helpers.test.ts
npm run lint
npm run build
docker compose config
```

## Fluxo manual obrigatorio

1. Abrir `/contents/new`.
2. Criar conteudo manual com titulo, prompt, tipo, legenda, 2-4 imagens e um audio.
3. Testar rejeicao de midia invalida.
4. Confirmar arquivos em `storage/uploads/<projectId>/` e midias na tela de detalhe.
5. Gerar/regenerar video.
6. Confirmar preview vertical 1080x1920, legenda em blocos legiveis e sem delay visivel.
7. Confirmar video em `storage/generated/`.
8. Baixar pelo link com `download=1`.
9. Agendar com plataforma, data, horario e caption.
10. Confirmar item em `/schedule` e label `Pronto para postar` quando o horario estiver vencido.
11. Excluir o conteudo e confirmar que ele some de `/contents` e `/schedule`.
12. Se Gemini/Manus estiver configurado, testar caminho assistido. Se nao estiver, registrar `SKIPPED` ou `BLOQUEADO` com o motivo.

Fora do escopo deste checklist: publicacao real em redes sociais, login, fila/worker, S3/R2, workflow especifico de Stories e editor de legenda.

## Resultados desta execucao

Validacao automatica em 2026-04-22 17:53 America/Sao_Paulo:

- `npm test -- --run src/features/video/services/caption-helpers.test.ts`: PASS, 1 arquivo e 8 testes passaram.
- `npm run lint`: PASS, ESLint sem erros depois de corrigir fechamentos JSX duplicados em arquivos ja modificados.
- `npm run build`: PASS, Next.js 16.2.4 compilou e type-check concluiu.
- `docker compose config`: PASS, servico `postgres` valido em `localhost:5433` com volume `postgres_data`.

| Marcador | Data/Hora | Status | Rota ou comando | Evidencia |
|----------|-----------|--------|-----------------|-----------|
| CREATE | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/new` | Browser smoke nao executado nesta sessao: faltam fixtures locais de 2-4 imagens e um audio curto para criar projeto real. |
| UPLOAD | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/new` upload manual e teste de arquivo invalido | Browser smoke nao executado nesta sessao: sem fixtures locais para upload e sem tentativa real de MIME invalido. |
| GENERATE | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/[id]` acao de gerar/regenerar | Browser smoke nao executado nesta sessao: nenhum projeto real com imagem/audio foi criado para acionar FFmpeg. |
| REVIEW | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/[id]` | Browser smoke nao executado nesta sessao: sem `projectId` real e sem MP4 gerado para avaliar preview 1080x1920 e legenda. |
| DOWNLOAD | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/api/files/<generated>.mp4?download=1` | Browser smoke nao executado nesta sessao: sem arquivo em `storage/generated/` criado por este run para baixar. |
| SCHEDULE | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/[id]` formulario e `/schedule` | Browser smoke nao executado nesta sessao: sem video pronto para salvar agendamento e observar `Pronto para postar`. |
| DELETE | 2026-04-22 17:53 America/Sao_Paulo | BLOQUEADO | `/contents/[id]` excluir e conferir `/contents` `/schedule` | Browser smoke nao executado nesta sessao: sem projeto criado por este run para confirmar remocao de UI e storage. |
| ASSISTED | 2026-04-22 17:53 America/Sao_Paulo | SKIPPED | `/contents/new` intent assistido Gemini/Manus | Caminho opcional nao executado: credenciais Gemini/Manus nao foram validadas nesta sessao e segredos nao devem ser registrados aqui. |

Linhas com status `BLOQUEADO` devem ser substituidas por `PASS` ou `FAIL` quando a execucao manual for feita. Linhas com evidencia vazia nao contam como verificacao.
