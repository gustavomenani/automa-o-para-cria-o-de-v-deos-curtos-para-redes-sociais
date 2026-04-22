"use client";

import { useFormStatus } from "react-dom";
import { Wand2 } from "lucide-react";

export function GenerateVideoButton({
  hasVideo = false,
  locked = false,
}: {
  hasVideo?: boolean;
  locked?: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || locked;

  return (
    <button
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Wand2 size={16} />
      {pending || locked ? "Gerando video..." : hasVideo ? "Gerar novamente" : "Gerar video"}
    </button>
  );
}
