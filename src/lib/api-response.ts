import { NextResponse } from "next/server";

export const SAFE_ACTION_ERROR =
  "Nao foi possivel concluir a acao. Revise os dados e tente novamente.";
export const SAFE_PROCESSING_ERROR =
  "Nao foi possivel concluir o processamento. Revise os arquivos enviados e tente novamente.";

const SAFE_MESSAGES = new Set([
  "Faca login para acessar seus projetos.",
  "Voce nao tem acesso a este conteudo.",
  "Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente.",
  "Ja existe uma geracao em andamento para este projeto. Aguarde a conclusao antes de tentar novamente.",
  "Escolha uma data e horario futuros para salvar o agendamento.",
  "Projeto precisa de pelo menos uma imagem.",
  "Projeto precisa de um arquivo de audio.",
  "Gere um video antes de agendar a postagem.",
]);

function looksSensitive(message: string) {
  return (
    message.length > 260 ||
    /^[\[{]/.test(message.trim()) ||
    /\b(ffmpeg|ffprobe|stderr|stdout|spawn|traceback|stack|node_modules|libx264|sql|prisma)\b/i.test(message) ||
    /\bat\s+\S+\s+\(/.test(message) ||
    /([A-Z]:\\|\/Users\/|\/home\/|storage[\\/]|\.env|request headers?)/i.test(message) ||
    /(AIza[0-9A-Za-z_-]{20,}|MANUS_API_KEY|GEMINI_API_KEY|SESSION_SECRET|sk-[0-9A-Za-z_-]{20,})/.test(message)
  );
}

export function normalizeSafeError(error: unknown, fallback = SAFE_ACTION_ERROR) {
  const message = error instanceof Error ? error.message.trim() : "";

  if (!message) {
    return fallback;
  }

  if (SAFE_MESSAGES.has(message) || message.startsWith("Arquivo recusado.")) {
    return message;
  }

  if (looksSensitive(message)) {
    console.error("[safe-error-redacted]", error);
    return fallback;
  }

  return message;
}

export function apiError(error: unknown, fallback: string, status = 400) {
  return NextResponse.json(
    {
      error: normalizeSafeError(error, fallback),
    },
    { status },
  );
}

export function apiCreated<T>(payload: T) {
  return NextResponse.json(payload, { status: 201 });
}
