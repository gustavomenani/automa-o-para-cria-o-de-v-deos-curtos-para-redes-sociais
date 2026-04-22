"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { FeedbackBanner } from "@/components/feedback-banner";
import { loginAction, type LoginActionState } from "@/features/auth/actions";

const initialState: LoginActionState = {};

export function LoginForm({ message }: { message?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const feedback = state.message ?? message;

  return (
    <form action={formAction} className="space-y-5">
      {feedback ? (
        <FeedbackBanner type="error" title="Acesso necessario" message={feedback} />
      ) : null}

      <div>
        <label htmlFor="email" className="text-sm font-semibold text-zinc-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold text-zinc-800">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn size={16} />
        {pending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
