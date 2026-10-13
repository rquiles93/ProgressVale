"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Logo } from "./ui";

function GoogleMark() {
  return <span className="grid size-5 place-items-center rounded-full border border-line bg-white text-xs font-bold text-[#4285F4]">G</span>;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";

  return (
    <main className="grain min-h-screen bg-cream lg:grid lg:grid-cols-[minmax(420px,0.82fr)_1.18fr]">
      <section className="flex min-h-screen flex-col bg-paper px-6 py-7 sm:px-12 lg:px-[clamp(3rem,7vw,7rem)] lg:py-10">
        <Logo />
        <div className="my-auto w-full max-w-[430px] py-14">
          <div className="mb-9">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-rust">{isLogin ? "Bienvenido de nuevo" : "Crea tu espacio"}</p>
            <h1 className="font-serif text-4xl leading-[1.12] tracking-tight text-navy sm:text-[46px]">{isLogin ? "Continúa tu trabajo." : "Comienza a evaluar."}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{isLogin ? "Accede a tus clientes y retoma tus evaluaciones donde las dejaste." : "Organiza clientes y evaluaciones en un espacio claro y profesional."}</p>
          </div>

          <button type="button" className="focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-sm font-semibold text-navy transition hover:border-navy/30 hover:bg-cream/50">
            <GoogleMark /> Continuar con Google
          </button>
          <p className="mt-2 text-center text-[10px] leading-4 text-ink/45">Sólo se solicitarán tu nombre, correo electrónico e imagen de perfil.</p>

          <div className="my-7 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35"><span className="h-px flex-1 bg-line" /><span>o con tu correo</span><span className="h-px flex-1 bg-line" /></div>

          <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-navy">Correo electrónico</span>
              <span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input type="email" placeholder="nombre@ejemplo.com" className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm placeholder:text-ink/30" /></span>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-semibold text-navy"><span>Contraseña</span>{isLogin && <span className="cursor-default font-medium text-rust">¿Olvidaste tu contraseña?</span>}</span>
              <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input type={showPassword ? "text" : "password"} placeholder={isLogin ? "Tu contraseña" : "Mínimo 8 caracteres"} className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-12 text-sm placeholder:text-ink/30" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/40 hover:text-navy">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {!isLogin && <p className="text-[11px] leading-5 text-ink/45">Al crear una cuenta aceptas los términos de uso y la política de privacidad.</p>}
            <Link href="/clientes" className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rust text-sm font-semibold text-white shadow-[0_8px_20px_rgba(54,95,74,0.2)] transition hover:bg-rust-dark">
              {isLogin ? "Iniciar sesión" : "Crear cuenta"} <ArrowRight size={17} />
            </Link>
          </form>
          <p className="mt-7 text-center text-sm text-ink/55">{isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"} <Link className="font-semibold text-rust hover:underline" href={isLogin ? "/registro" : "/login"}>{isLogin ? "Regístrate" : "Inicia sesión"}</Link></p>
        </div>
        <p className="text-[10px] text-ink/35">Prototipo de interfaz · Fase 1 · Sin autenticación real</p>
      </section>
      <aside className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
        <div className="absolute -right-36 -top-36 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-16 size-[320px] rounded-full border border-rust/50" />
        <div className="absolute bottom-24 left-16 h-px w-32 bg-rust" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Evaluación · Seguimiento · Progreso</p>
        <blockquote className="relative max-w-2xl">
          <p className="font-serif text-[clamp(2.8rem,4vw,4.7rem)] leading-[1.08] tracking-tight text-white">Una forma más clara de acompañar cada avance.</p>
          <p className="mt-8 max-w-lg text-base leading-7 text-white/55">Un entorno pensado para profesionales que necesitan foco, continuidad y una visión completa del proceso de evaluación.</p>
        </blockquote>
        <div className="relative flex items-center gap-3 text-[11px] text-white/40"><span className="size-2 rounded-full bg-rust" /> Interfaz demostrativa en español</div>
      </aside>
    </main>
  );
}
