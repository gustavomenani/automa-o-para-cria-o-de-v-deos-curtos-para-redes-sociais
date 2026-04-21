import { AppShell } from "@/components/app-shell";
import { CreateContentForm } from "@/features/content/components/create-content-form";

export default function NewContentPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Novo conteudo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Criar video curto</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Envie imagens, audio e legenda. Na revisao voce gera o MP4 vertical 1080x1920.
          </p>
        </div>
        <CreateContentForm />
      </div>
    </AppShell>
  );
}
