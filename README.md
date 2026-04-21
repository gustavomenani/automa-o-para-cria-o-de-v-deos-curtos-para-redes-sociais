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

3. Instale dependencias e prepare o banco:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

4. Garanta que o FFmpeg esteja instalado e acessivel via `ffmpeg`, ou ajuste `FFMPEG_PATH` no `.env`.

5. Rode o app:

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

## Arquitetura de pastas

```txt
src/
  app/
    api/files/              # entrega segura dos arquivos locais
    contents/               # criacao, revisao e historico
    page.tsx                # dashboard
  components/               # componentes reutilizaveis de UI
  features/
    content/                # dominio principal do MVP
      actions.ts            # server actions do fluxo
      queries.ts            # consultas Prisma
      components/           # componentes especificos do dominio
      types.ts
  integrations/
    manus/                  # stub para integracao futura
    social/                 # stub para publicacao/agendamento futuro
  lib/
    ffmpeg/                 # servico isolado de geracao de video
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
npm run prisma:migrate
```

Se quiser inspecionar o banco:

```bash
npm run db:studio
```

## Decisoes de arquitetura

- `features/content` concentra o fluxo principal para evitar espalhar regra de negocio pelas paginas.
- `lib/ffmpeg/video-generator.ts` isola a chamada ao FFmpeg. Esse modulo pode virar um worker/fila depois sem mudar as telas.
- `lib/storage/local-storage.ts` encapsula gravacao em disco. Uma futura migracao para S3/R2 deve preservar a mesma ideia de contrato.
- `integrations/manus` e `integrations/social` existem apenas como interfaces/stubs. Nenhuma chamada externa real e feita no MVP.
- O banco salva projetos, arquivos de midia, videos gerados, contas sociais e agendamentos futuros.
