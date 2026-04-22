# Short Video Automation

Sistema web MVP para criacao de videos curtos verticais para redes sociais.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- FFmpeg
- Storage local no MVP

## Rodando localmente

1. Copie as variaveis de ambiente se necessario:

```bash
cp .env.example .env
```

2. Suba o Postgres:

```bash
docker compose up -d
```

O container expoe o Postgres em `localhost:5433` para evitar conflito com instalacoes locais usando `5432`.

3. Instale dependencias e prepare o banco:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
```

4. Garanta que o FFmpeg esteja instalado e acessivel via `ffmpeg`, ou ajuste `FFMPEG_PATH` no `.env`.
   Se o `ffprobe` nao estiver no PATH, ajuste tambem `FFPROBE_PATH`.

5. Para testar a Gemini, preencha no `.env`:

```env
GEMINI_API_KEY="sua-chave-da-gemini"
```

Sem essa variavel, o app continua funcionando no fluxo manual e mostra um erro amigavel ao clicar em `Gerar assets com Gemini`.

Para usar Manus como provedor principal, configure `MANUS_API_KEY` no `.env` ou salve a chave em `/settings`.
As chaves sao usadas somente no servidor e nao devem ser commitadas.

6. Para legendas com timestamps reais, instale o Whisper local:

```bash
python -m pip install -r requirements-whisper.txt
```

Variaveis opcionais:

```env
WHISPER_PYTHON_PATH="python"
WHISPER_MODEL="base"
WHISPER_LANGUAGE="pt"
WHISPER_DEVICE="cpu"
WHISPER_COMPUTE_TYPE="int8"
WHISPER_TIMEOUT_MS="240000"
```

Se o Whisper local nao estiver instalado, o app continua gerando videos com sincronizacao aproximada baseada na duracao do audio.

7. Rode o app:

```bash
npm run dev
```

## Fluxo MVP

1. Criar conteudo
2. Enviar imagens
3. Enviar audio
4. Adicionar legenda
5. Revisar conteudo
6. Gerar video vertical MP4 em 1080x1920
7. Baixar video
8. Consultar historico

## Rotas principais

- `/dashboard`: visao geral e projetos recentes.
- `/contents`: lista de projetos de conteudo.
- `/contents/new`: criacao de projeto com prompt, legenda, imagens e audio.
- `/contents/[id]`: revisao do projeto, geracao do MP4, download e agendamento basico.
- `/schedule`: lista de postagens agendadas salvas no banco.
- `/settings`: base visual para configuracoes e integracoes futuras.

## Arquitetura de pastas

```txt
src/
  app/
    api/                    # API routes do App Router
    contents/               # criacao, revisao e historico
    dashboard/              # visao geral
    schedule/               # agendamentos salvos
    settings/               # configuracoes e Manus
  components/               # componentes reutilizaveis de UI
  features/
    content/                # dominio principal do MVP
      actions.ts            # server actions do fluxo
      queries.ts            # consultas Prisma
      services/             # upload e persistencia de midias
      components/           # componentes especificos do dominio
      types.ts
    schedule/               # actions e queries de agendamento
    settings/               # actions e queries de configuracao
    video/
      services/             # VideoService com FFmpeg/ffprobe
  integrations/
    gemini/                 # integracao real de teste com Google Gemini
    manus/                  # cliente Manus com API real quando configurada e fallback local
    social/                 # stub para publicacao/agendamento futuro
  lib/
    api-response.ts         # respostas padronizadas de API
    formatters.ts           # formatadores compartilhados
    storage/                # storage local substituivel por S3/R2
    paths.ts
    prisma.ts
prisma/
  schema.prisma             # modelos User, ContentProject, MediaFile, GeneratedVideo, ScheduledPost e SocialAccount
storage/
  uploads/                  # arquivos enviados no MVP
  generated/                # MP4s gerados no MVP
```

## Banco de dados

O schema principal fica em `prisma/schema.prisma` e possui:

- `User`: usuario dono de projetos e contas sociais.
- `ContentProject`: projeto de conteudo com titulo, prompt, tipo, status e data de criacao.
- `MediaFile`: arquivos usados no projeto, como imagem, audio, legenda e video.
- `GeneratedVideo`: video final gerado, com caminho, duracao, resolucao e status.
- `ScheduledPost`: agendamento futuro por plataforma.
- `SocialAccount`: conta social conectavel futuramente.

Para aplicar a migration apos subir o Docker:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:deploy
```

Se quiser inspecionar o banco:

```bash
npm run db:studio
```

## Upload de arquivos

Os uploads ficam no storage local do MVP:

```txt
storage/
  uploads/
    <contentProjectId>/
      <uuid>-<nome-sanitizado>
  generated/
    <contentProjectId>.mp4
```

Cada upload tambem gera um registro em `media_files`, vinculado ao `ContentProject` por `projectId`.

Endpoints:

- `POST /api/content-projects`
  - Cria um `ContentProject`.
  - Salva multiplas imagens e um audio em `storage/uploads/<projectId>/`.
  - Cria os registros `MediaFile` no banco.
  - Espera `multipart/form-data` com:
    - `title`
    - `prompt`
    - `caption` opcional
    - `contentType`: `REELS`, `STORY`, `TIKTOK` ou `YOUTUBE_SHORTS`
    - `images`: um ou mais arquivos
    - `audio`: um arquivo

- `POST /api/content-projects/[id]/media`
  - Anexa novas midias a um projeto existente.
  - Espera `multipart/form-data` com:
    - `images`: zero ou mais arquivos
    - `audio`: zero ou um arquivo

Validacao:

- Imagens aceitas: JPG, PNG e WEBP.
- Audios aceitos: MP3, WAV, M4A, AAC, OGG e WEBM.
- Qualquer outro MIME type retorna erro `400`.

## Geracao de video

A geracao fica isolada em `src/features/video/services/video-service.ts`, na classe `VideoService`.

Fluxo:

1. Busca o `ContentProject` e seus `MediaFile`.
2. Valida se ha pelo menos uma imagem e um audio.
3. Usa `ffprobe` para calcular a duracao total do audio.
4. Divide a duracao do audio igualmente entre as imagens.
5. Usa FFmpeg para gerar um MP4 vertical `1080x1920`.
6. Tenta transcrever o audio com Whisper local para obter timestamps reais.
7. Gera uma legenda `.ass` premium com texto branco, contorno preto, sem fundo e margem segura.
8. Se o Whisper nao estiver disponivel, usa fallback proporcional pela duracao do audio.
9. Salva o video em `storage/generated/<projectId>.mp4`.
10. Cria/atualiza `GeneratedVideo`.
11. Atualiza `ContentProject.status` para `READY`.
12. Em caso de erro, atualiza `ContentProject.status` para `ERROR`.

Endpoint:

- `POST /api/content-projects/[id]/generate`
  - Gera o video final do projeto.
  - Retorna caminho, duracao e resolucao do video gerado.
  - Opcionalmente aceita JSON `{ "caption": "texto da legenda" }` para sobrescrever a legenda salva apenas nessa geracao.

## Gemini

A integracao de teste com Google Gemini fica em `src/integrations/gemini/gemini-service.ts`.

O service le a chave apenas do servidor, por `process.env.GEMINI_API_KEY`, e expõe:

- `generateReelsPlan(prompt)`: envia o prompt para `gemini-2.5-flash` e retorna roteiro, legenda, caption, hashtags, ideias de cenas e prompts de imagem.
- `generateSceneImages(imagePrompts)`: tenta gerar imagens verticais 9:16 com `gemini-2.5-flash-image`.
- `generateNarrationAudio(script)`: tenta gerar narracao em portugues brasileiro com `gemini-2.5-flash-preview-tts`.
- `generateTestAssetsForProject(projectId, prompt)`: salva imagens/audio em `storage/uploads/<projectId>/`, registra `MediaFile` no banco e atualiza titulo/legenda do projeto.

Na tela `/contents/[id]`, o botao `Gerar assets com Gemini` ainda pode disparar esse fluxo diretamente. No fluxo assistido principal, a criacao em `/contents/new` tenta gerar assets por Manus quando configurada e usa Gemini como fallback quando necessario. Se imagem ou audio nao forem retornados, o sistema mantem o plano textual gerado e permite continuar com upload manual.

A Gemini atua como fallback quando a Manus nao estiver configurada ou nao conseguir entregar todos os assets. O fluxo principal e Manus-first, mantendo a Gemini como rede de seguranca para a geracao do plano textual, imagens e audio.

## Pipeline de IA e troubleshooting

Prioridade do fluxo de assets:

Resumo operacional: Manus primary, Gemini fallback.

1. Manus cria a task principal, registra status/task id e tenta retornar plano + anexos.
2. Gemini atua como fallback/teste quando Manus nao esta configurada ou retorna resultado parcial.
3. Se imagem ou audio nao forem gerados, o projeto preserva o plano textual e mostra orientacao para upload manual.

Falhas comuns e acao recomendada:

- Quota excedida: aguarde a janela do provedor ou troque a chave/modelo configurado.
- Chave invalida: revise `MANUS_API_KEY`, `GEMINI_API_KEY` e as permissoes da conta.
- Modelo indisponivel: tente novamente mais tarde ou ajuste a preferencia de modelo em `/settings`.
- Anexos vazios: complete imagens/audio pelo upload manual antes de gerar o MP4.
- Acao manual requerida: acesse a conta do provedor, resolva a solicitacao e rode novamente.

Nunca exponha chaves em componentes de frontend, logs compartilhados ou commits.

## Agendamento

O MVP salva agendamentos em `scheduled_posts`, sem publicar automaticamente.

Na tela `/contents/[id]`, depois que houver video gerado, o usuario pode escolher:

- plataforma: Instagram, TikTok ou YouTube
- data
- horario
- caption da postagem

Ao salvar, o sistema cria um `ScheduledPost`, atualiza o projeto para `SCHEDULED` e mostra o item em `/schedule`.

## Manus

A integracao com Manus fica concentrada em `src/integrations/manus/manus-service.ts`.
Quando `MANUS_API_KEY` estiver no `.env` ou a chave estiver salva em `/settings`, o service usa a API da Manus para criar tarefas, consultar mensagens e baixar anexos retornados. Sem chave configurada, o app mantem comportamento de fallback/mock para nao quebrar o fluxo manual do MVP.

O service expõe:

- `createTask(prompt)`
- `getTaskStatus(taskId)`
- `listTaskMessages(taskId)`
- `downloadGeneratedFiles(taskId)`

O uso real da API depende de chave e plano com acesso liberado. Se a Manus nao retornar imagens/audio suficientes, o usuario ainda pode completar o projeto pelo upload manual.

As configuracoes da Manus ficam em `/settings` e sao salvas em `manus_settings`:

- API Key
- preferencia de modelo
- preferencia de prompt
- configuracao padrao para Reels
- configuracao padrao para Stories

## Decisoes de arquitetura

- `features/content` concentra o fluxo principal para evitar espalhar regra de negocio pelas paginas.
- `features/video/services/video-service.ts` isola a chamada ao FFmpeg. Esse modulo pode virar um worker/fila depois sem mudar as telas.
- `lib/storage/local-storage.ts` encapsula gravacao em disco. Uma futura migracao para S3/R2 deve preservar a mesma ideia de contrato.
- `integrations/manus` possui cliente real quando a chave esta configurada e fallback quando nao esta. `integrations/social` permanece como interface/stub; nenhuma publicacao real em Instagram, TikTok ou YouTube e feita no MVP.
- O banco salva projetos, arquivos de midia, videos gerados, contas sociais e agendamentos futuros.

## Rodando do zero

Em uma maquina nova:

```bash
git clone https://github.com/gustavomenani/automa-o-para-cria-o-de-v-deos-curtos-para-redes-sociais.git
cd automa-o-para-cria-o-de-v-deos-curtos-para-redes-sociais
npm install
copy .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

No Windows deste projeto, o `.env.example` ja aponta para:

```env
FFMPEG_PATH="C:/ffmpeg/bin/ffmpeg.exe"
FFPROBE_PATH="C:/ffmpeg/bin/ffprobe.exe"
```

Depois acesse `http://localhost:3000/dashboard`.

Para validar a Gemini:

1. Adicione `GEMINI_API_KEY` no `.env`.
2. Reinicie `npm run dev`.
3. Crie um projeto com prompt em `/contents/new`.
4. Abra `/contents/[id]` e clique em `Gerar assets com Gemini`.
5. Confira o roteiro, captions, hashtags, prompts e arquivos salvos na tela de revisao.

Para validar o fallback sem chave, remova `GEMINI_API_KEY` do `.env`, reinicie o servidor e clique no mesmo botao. A tela deve mostrar a mensagem `GEMINI_API_KEY não configurada. Adicione a chave no arquivo .env.` e o fluxo manual continua disponivel.

Fluxo manual para validar:

1. Abra `/contents/new`.
2. Preencha titulo, prompt, tipo e legenda.
3. Envie imagens e um audio.
4. Clique em `Salvar e gerar video`.
5. Revise em `/contents/[id]`.
6. Baixe o video gerado.
7. Preencha plataforma, data, horario e caption.
8. Salve o agendamento e confira em `/schedule`.
