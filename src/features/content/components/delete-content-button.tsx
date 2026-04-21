"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteContentProjectAction } from "@/features/content/actions";

const confirmationMessage =
  "Tem certeza que deseja excluir este conteúdo? Essa ação não pode ser desfeita.";

type DeleteContentButtonProps = {
  contentId: string;
  compact?: boolean;
  fullWidth?: boolean;
  redirectTarget?: "contents" | "schedule";
};

export function DeleteContentButton({
  contentId,
  compact = false,
  fullWidth = false,
  redirectTarget = "contents",
}: DeleteContentButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    startTransition(async () => {
      await deleteContentProjectAction(contentId, redirectTarget);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-zinc-400 ${
        compact ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm font-semibold"
      } ${fullWidth ? "w-full" : ""}`}
    >
      <Trash2 size={compact ? 14 : 16} />
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
