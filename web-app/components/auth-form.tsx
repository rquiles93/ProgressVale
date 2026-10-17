"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "./ui";

function GoogleMark() {
  return <span className="grid size-5 place-items-center rounded-full border border-line bg-white text-xs font-bold text-[#4285F4]">G</span>;
}

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "register"; googleEnabled: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const router = useRouter();
  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    if (!isLogin && (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password))) {
      setPending(false);
      setError("La contraseña debe tener al menos 12 caracteres, una letra y un número.");
      return;
    }

    const result = isLogin
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name });

    setPending(false);
    if (result.error) {
      setError(
        result.error.status === 429
          ? "Demasiados intentos. Espera un momento antes de intentarlo de nuevo."
          : result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || result.error.code === "USER_ALREADY_EXISTS"
            ? "Ya existe una cuenta con ese correo electrónico."
          : isLogin
            ? "Correo o contraseña incorrectos."
            : "No se pudo crear la cuenta con esos datos.",
      );
      return;
    }

    router.replace("/clientes");
    router.refresh();
  }

  async function continueWithGoogle() {
    if (!googleEnabled || pending) return;
    setPending(true);
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/clientes", errorCallbackURL: `/${isLogin ? "login" : "registro"}?oauthError=1` });
    if (result?.error) {
      setPending(false);
      setError("No se pudo iniciar el acceso con Google.");
    }
  }

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

          <button type="button" disabled={!googleEnabled || pending} onClick={continueWithGoogle} aria-describedby={!googleEnabled ? "google-unavailable" : undefined} className="focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:text-navy/55">
            <GoogleMark /> Continuar con Google {!googleEnabled && <span className="rounded-full bg-rust-soft px-2 py-0.5 text-[9px] uppercase tracking-wide text-rust-dark">Pendiente</span>}
          </button>
          {!googleEnabled && <p id="google-unavailable" className="mt-2 text-center text-[10px] leading-4 text-ink/45">Requiere configuración de Google Cloud. Sólo solicitará identidad básica.</p>}

          <div className="my-7 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35"><span className="h-px flex-1 bg-line" /><span>o con tu correo</span><span className="h-px flex-1 bg-line" /></div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Nombre</span><span className="relative block"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" placeholder="Tu nombre" className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm placeholder:text-ink/30" /></span></label>}
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-navy">Correo electrónico</span>
              <span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="nombre@ejemplo.com" className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm placeholder:text-ink/30" /></span>
            </label>
            <div className="block">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-navy"><label htmlFor="auth-password">Contraseña</label>{isLogin && <button type="button" onClick={() => setResetNotice(true)} className="focus-ring rounded font-medium text-rust">¿Olvidaste tu contraseña?</button>}</div>
              <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input id="auth-password" name="password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Tu contraseña" : "Mínimo 12 caracteres"} className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-12 text-sm placeholder:text-ink/30" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/40 hover:text-navy">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </div>
            {resetNotice && <p role="status" className="rounded-xl border border-line bg-cream px-4 py-3 text-xs leading-5 text-ink/60">La recuperación por correo todavía no está disponible porque no hay un servicio de envío configurado. Contacta al administrador antes de crear otra cuenta.</p>}
            {!isLogin && <p className="text-[11px] leading-5 text-ink/45">Al crear una cuenta aceptas los términos de uso y la política de privacidad.</p>}
            {error && <p role="alert" className="rounded-xl bg-rust-soft/60 px-4 py-3 text-xs text-rust-dark">{error}</p>}
            <button type="submit" disabled={pending} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rust text-sm font-semibold text-white shadow-[0_8px_20px_rgba(54,95,74,0.2)] transition hover:bg-rust-dark disabled:cursor-wait disabled:opacity-70">
              {pending ? "Procesando…" : isLogin ? "Iniciar sesión" : "Crear cuenta"} <ArrowRight size={17} />
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-ink/55">{isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"} <Link className="font-semibold text-rust hover:underline" href={isLogin ? "/registro" : "/login"}>{isLogin ? "Regístrate" : "Inicia sesión"}</Link></p>
        </div>
        <p className="text-[10px] text-ink/35">Acceso seguro · ABLLS-R</p>
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
