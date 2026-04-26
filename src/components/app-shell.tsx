import Link from "next/link";
import {
  CalendarClock,
  Clapperboard,
  History,
  LayoutDashboard,
  PlusCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contents", label: "Conteudos", icon: History },
  { href: "/contents/new", label: "Novo conteudo", icon: PlusCircle },
  { href: "/schedule", label: "Agenda", icon: CalendarClock },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-stone-200 bg-white px-5 py-6 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Clapperboard size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Studio
            </span>
            <span className="block text-lg font-semibold">Short Videos</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-stone-100 hover:text-zinc-950"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 border-t border-stone-200 pt-5 text-xs leading-5 text-zinc-500">
          MVP local com FFmpeg, Prisma e storage em disco. Manus alimenta a geracao automatica e a publicacao externa segue desativada.
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Clapperboard size={20} className="text-teal-700" />
            Short Videos
          </Link>
          <Link
            href="/contents/new"
            className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white"
          >
            Novo
          </Link>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700"
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
