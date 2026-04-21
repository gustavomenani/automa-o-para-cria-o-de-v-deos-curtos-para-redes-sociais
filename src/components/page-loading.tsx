export function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-md bg-stone-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-28 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-28 animate-pulse rounded-lg bg-stone-200" />
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-zinc-500">
        {label}
      </div>
    </div>
  );
}
