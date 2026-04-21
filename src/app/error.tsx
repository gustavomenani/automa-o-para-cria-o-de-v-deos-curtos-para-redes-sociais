"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <section className="w-full max-w-xl rounded-lg border border-red-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-zinc-950">Algo deu errado</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {error.message || "A acao nao pode ser concluida agora."}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              <RotateCcw size={16} />
              Tentar novamente
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
