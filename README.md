# Short Video Automation

Sistema web para criar videos curtos verticais para redes sociais com pipeline `Manus-only`, render local com FFmpeg e publicacao social via OAuth oficial.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- FFmpeg / ffprobe
- Storage local

## Fluxo atual

1. Criar um projeto de conteudo
2. Gerar assets com a Manus
3. Revisar imagens, audio, roteiro e legenda
4. Gerar o MP4 vertical
5. Publicar agora ou agendar para Instagram, TikTok e YouTube

O fluxo automatico de assets usa apenas a Manus. Se a Manus nao entregar imagens ou audio suficientes, o sistema preserva o plano textual e exige complemento manual antes da renderizacao final.

## Requisitos locais

- Node.js 20+
- Docker e Docker Compose
- FFmpeg e ffprobe instalados
- Python opcional para Whisper local

## Variaveis de ambiente

Copie:

```bash
cp .env.example .env
```

Campos principais do `.env.example`:

```env
DATABASE_URL="postgresql://app:app@localhost:5433/short_video_automation?schema=public"
FFMPEG_PATH="ffmpeg"
FFPROBE_PATH="ffprobe"
LOCAL_STORAGE_ROOT="./storage"
MANUS_API_KEY=""
SESSION_SECRET=""
INITIAL_USER_EMAIL=""
INITIAL_USER_PASSWORD=""
APP_BASE_URL="http://localhost:3000"
PUBLIC_MEDIA_BASE_URL=""
SOCIAL_TOKEN_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_OAUTH_CALLBACK_URL="http://localhost:3000/api/oauth/youtube/callback"
INSTAGRAM_APP_ID=""
INSTAGRAM_APP_SECRET=""
INSTAGRAM_OAUTH_CALLBACK_URL="http://localhost:3000/api/oauth/instagram/callback"
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
TIKTOK_OAUTH_CALLBACK_URL="http://localhost:3000/api/oauth/tiktok/callback"
```

### Observacoes importantes

- `MANUS_API_KEY`: obrigatoria para geracao automatica de assets
- `PUBLIC_MEDIA_BASE_URL`: obrigatoria para publicacao no Instagram e deve ser uma URL publica, nao `localhost`
- credenciais de YouTube, Instagram e TikTok sao obrigatorias para OAuth e publicacao real
- `SOCIAL_TOKEN_SECRET` deve ser um segredo forte em producao
- `SESSION_SECRET` deve ter pelo menos 32 caracteres
- `INITIAL_USER_EMAIL` e `INITIAL_USER_PASSWORD` permitem criar o primeiro acesso automaticamente no primeiro login

## Rodando localmente

1. Suba o banco:

```bash
docker compose up -d
```

2. Instale dependencias:

```bash
npm install
```

3. Gere o client Prisma e aplique as migrations:

```bash
npm run prisma:generate
npm run prisma:deploy
```

4. Rode o servidor:

```bash
npm run dev
```

5. Acesse:

```txt
http://localhost:3000/dashboard
```

## Build de producao

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run db:studio`

## Docker

Para desenvolvimento rapido, o repositório ainda possui o Postgres isolado em [docker-compose.yml](./docker-compose.yml):

```bash
docker compose up -d
```

Para VPS e producao, use:

- [Dockerfile](./Dockerfile)
- [docker-compose.production.yml](./docker-compose.production.yml)

## Rotas principais

- `/dashboard`
- `/contents`
- `/contents/new`
- `/contents/[id]`
- `/schedule`
- `/settings`

## Publicacao social

O projeto suporta conexao e publicacao para:

- YouTube
- Instagram
- TikTok

Cada plataforma exige:

- app de desenvolvedor proprio do cliente
- credenciais OAuth oficiais
- redirect URI configurado

Sem essas credenciais, o sistema nao consegue concluir autenticacao nem publicacao.

## Manus

A Manus e o unico provedor automatico de assets deste projeto.

Ela e responsavel por:

- roteiro
- caption
- ideias de cena
- imagens
- audio

Quando a resposta vier parcial, o sistema salva o que foi retornado e deixa o restante para revisao/manual.

## Whisper local

Opcionalmente, voce pode instalar Whisper para melhorar o timing das legendas:

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

Sem Whisper, o sistema ainda gera o video usando sincronizacao aproximada baseada na duracao do audio.

## Estrutura principal

```txt
src/
  app/
    api/
    contents/
    dashboard/
    schedule/
    settings/
  components/
  features/
    content/
    schedule/
    settings/
    video/
  integrations/
    manus/
    social/
  lib/
prisma/
storage/
```

## Entrega em VPS

Antes de colocar em VPS, confirme:

- Node instalado
- FFmpeg e ffprobe instalados
- banco Postgres acessivel
- `.env` preenchido com credenciais reais
- dominio/HTTPS configurado para os callbacks OAuth
- `PUBLIC_MEDIA_BASE_URL` apontando para URL publica valida

### Passo a passo recomendado

1. Copie o projeto para a VPS
2. Crie o `.env` a partir do `.env.example`
3. Preencha todas as credenciais reais
4. Ajuste:

```env
APP_BASE_URL="https://seu-dominio.com"
PUBLIC_MEDIA_BASE_URL="https://seu-dominio.com"
SESSION_SECRET="seu-segredo-forte"
SOCIAL_TOKEN_SECRET="outro-segredo-forte"
```

5. Suba a stack:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

6. Verifique os logs:

```bash
docker compose -f docker-compose.production.yml logs -f app
```

7. Acesse:

```txt
https://seu-dominio.com/login
```

### Observacoes de producao

- o container da aplicacao executa `prisma migrate deploy` na inicializacao
- o storage fica persistido em volume Docker
- o banco tambem fica persistido em volume Docker
- para SSL e dominio publico, o ideal e colocar Nginx ou Caddy na frente do container

## Testes realizados

Com o estado atual do projeto:

- `npm run build`
- `npx vitest run`

ambos passaram localmente antes do ultimo push.
