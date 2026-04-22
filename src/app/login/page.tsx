import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; loggedOut?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const feedback = await searchParams;
  const message = feedback.error === "auth" ? "Faca login para acessar seus projetos." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-teal-700">Acesso</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Entrar no painel</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Use suas credenciais locais para acessar projetos, arquivos e configuracoes.
          </p>
        </div>
        <LoginForm message={message} />
      </section>
    </main>
  );
}
