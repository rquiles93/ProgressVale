import Link from "next/link";
import { ArrowLeft, ChevronDown, UserRound } from "lucide-react";
import { LogoutButton } from "./logout-button";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/clientes" className={`focus-ring inline-flex flex-none items-baseline gap-1.5 whitespace-nowrap rounded-sm sm:gap-2 ${light ? "text-white" : "text-navy"}`}>
      <span className="font-serif text-[23px] tracking-tight sm:text-[28px]">ABLLS-R</span>
      <span className={`hidden text-[8px] font-semibold uppercase tracking-[0.18em] min-[360px]:inline sm:text-[9px] sm:tracking-[0.22em] ${light ? "text-white/55" : "text-rust"}`}>Evaluación</span>
    </Link>
  );
}

export function AppHeader({ back, user }: { back?: { href: string; label: string }; user: { name: string; email: string } }) {
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-[1540px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-8">
          <Logo />
          {back && (
            <Link href={back.href} className="focus-ring hidden items-center gap-2 rounded-md text-sm font-medium text-ink/70 transition hover:text-rust sm:flex">
              <ArrowLeft size={16} /> {back.label}
            </Link>
          )}
        </div>
        <details className="group relative">
          <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-full py-1 pl-1 pr-2 transition hover:bg-cream">
            <span className="grid size-9 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{initials}</span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-xs font-semibold text-navy">{user.name}</span>
              <span className="block max-w-40 truncate text-[10px] text-ink/50">{user.email}</span>
            </span>
            <ChevronDown size={14} className="text-ink/50 transition group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-paper p-2 shadow-soft">
            <Link href="/perfil" className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-cream"><UserRound size={16} /> Mi perfil y seguridad</Link>
            <div className="my-1 border-t border-line" />
            <LogoutButton />
          </div>
        </details>
      </div>
    </header>
  );
}

export function StatusPill({ status }: { status: string }) {
  const style = status === "En progreso" ? "bg-rust-soft text-rust-dark" : status === "Completada" ? "bg-[#E8F0E7] text-[#365F4A]" : "bg-[#ECEAE6] text-ink/60";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}
