"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { googleOAuthErrorMessage, requiresGoogleAccountLink } from "@/lib/google-auth-flow";
import { Logo } from "./ui";
import { EmailRequestForm } from "./email-auth-forms";

function GoogleMark() {
  return <span className="grid size-5 place-items-center rounded-full border border-line bg-white text-xs font-bold text-[#4285F4]">G</span>;
}

export function AuthForm({ mode, googleEnabled, oauthError, linkGoogleRequested = false }: { mode: "login" | "register"; googleEnabled: boolean; oauthError?: string; linkGoogleRequested?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(googleOAuthErrorMessage(oauthError));
  const [pending, setPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const router = useRouter();
  const isLogin = mode === "login";
  const needsGoogleLink = isLogin && requiresGoogleAccountLink(oauthError, linkGoogleRequested);

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
      setError("Your password must contain at least 12 characters, one letter, and one number.");
      return;
    }

    const result = isLogin
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name });

    setPending(false);
    if (result.error) {
      if (isLogin && result.error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
        setError("Verify your email before signing in.");
        return;
      }
      setError(
        result.error.status === 429
          ? "Too many attempts. Wait a moment before trying again."
          : result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || result.error.code === "USER_ALREADY_EXISTS"
            ? "An account with that email already exists."
          : isLogin
            ? "Incorrect email or password."
            : "The account could not be created with those details.",
      );
      return;
    }

    router.replace(isLogin ? (needsGoogleLink ? "/perfil?linkGoogle=1" : "/clientes") : "/verificar-correo/pendiente");
    router.refresh();
  }

  async function continueWithGoogle() {
    if (!googleEnabled || pending) return;
    setPending(true);
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/clientes", newUserCallbackURL: "/clientes", errorCallbackURL: "/login?oauth=google" });
    if (result?.error) {
      setPending(false);
      setError("Google sign-in could not be started.");
    }
  }

  return (
    <main className="grain min-h-screen bg-cream lg:grid lg:grid-cols-[minmax(420px,0.82fr)_1.18fr]">
      <section className="flex min-h-screen flex-col bg-paper px-6 py-7 sm:px-12 lg:px-[clamp(3rem,7vw,7rem)] lg:py-10">
        <Logo />
        <div className="my-auto w-full max-w-[430px] py-14">
          <div className="mb-9">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-rust">{isLogin ? "Welcome back" : "Create your workspace"}</p>
            <h1 className="font-serif text-4xl leading-[1.12] tracking-tight text-navy sm:text-[46px]">{isLogin ? "Continue your work." : "Start evaluating."}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{isLogin ? "Access your clients and continue assessments where you left off." : "Organize clients and assessments in a clear, professional workspace."}</p>
          </div>

          <button type="button" disabled={!googleEnabled || pending} onClick={continueWithGoogle} aria-describedby={!googleEnabled ? "google-unavailable" : undefined} className="focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:text-navy/55">
            <GoogleMark /> Continue with Google {!googleEnabled && <span className="rounded-full bg-rust-soft px-2 py-0.5 text-[9px] uppercase tracking-wide text-rust-dark">Unavailable</span>}
          </button>
          {!googleEnabled && <p id="google-unavailable" className="mt-2 text-center text-[10px] leading-4 text-ink/45">Google Cloud configuration is required. Only basic identity information will be requested.</p>}
          {needsGoogleLink && <div role="status" className="mt-4 rounded-xl border border-rust/25 bg-rust-soft/55 px-4 py-3 text-xs leading-5 text-rust-dark"><p className="font-semibold">Confirm your existing account</p><p className="mt-1">That email already belongs to a ProgressVale account. Sign in with its password, then verify Google to link it securely.</p></div>}

          <div className="my-7 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35"><span className="h-px flex-1 bg-line" /><span>or use your email</span><span className="h-px flex-1 bg-line" /></div>

          <form method="post" action={`/api/auth/${isLogin ? "sign-in" : "sign-up"}/email`} onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && <label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Name</span><span className="relative block"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name" className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm placeholder:text-ink/30" /></span></label>}
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-navy">Email</span>
              <span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm placeholder:text-ink/30" /></span>
            </label>
            <div className="block">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-navy"><label htmlFor="auth-password">Password</label>{isLogin && <Link href="/recuperar-contrasena" className="focus-ring rounded font-medium text-rust">Forgot your password?</Link>}</div>
              <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input id="auth-password" name="password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Your password" : "At least 12 characters"} className="focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-12 text-sm placeholder:text-ink/30" /><button type="button" disabled={!hydrated} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/40 hover:text-navy disabled:cursor-not-allowed disabled:opacity-50">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </div>
            {!isLogin && <p className="text-[11px] leading-5 text-ink/45">By creating an account, you accept the terms of use and privacy policy.</p>}
            {error && <p role="alert" className="rounded-xl bg-rust-soft/60 px-4 py-3 text-xs text-rust-dark">{error}</p>}
            <noscript><p role="alert" className="rounded-xl bg-rust-soft/60 px-4 py-3 text-xs text-rust-dark">Enable JavaScript to sign in securely. The form will not submit your credentials without JavaScript.</p></noscript>
            <button type="submit" disabled={!hydrated || pending} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rust text-sm font-semibold text-white shadow-[0_8px_20px_rgba(54,95,74,0.2)] transition hover:bg-rust-dark disabled:cursor-wait disabled:opacity-70">
              {pending ? "Processing…" : isLogin ? "Sign in" : "Create account"} <ArrowRight size={17} />
            </button>
          </form>
          {unverifiedEmail && <div className="mt-5 rounded-xl border border-line bg-cream p-4"><p className="mb-3 text-xs font-semibold text-navy">Resend verification</p><EmailRequestForm kind="verification" defaultEmail={unverifiedEmail} /></div>}
          <p className="mt-7 text-center text-sm text-ink/55">{isLogin ? "Don’t have an account yet?" : "Already have an account?"} <Link className="font-semibold text-rust hover:underline" href={isLogin ? "/registro" : "/login"}>{isLogin ? "Register" : "Sign in"}</Link></p>
        </div>
        <p className="text-[10px] text-ink/35">Secure access · ProgressVale</p>
      </section>
      <aside className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
        <div className="absolute -right-36 -top-36 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-16 size-[320px] rounded-full border border-rust/50" />
        <div className="absolute bottom-24 left-16 h-px w-32 bg-rust" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Evaluation · Tracking · Progress</p>
        <blockquote className="relative max-w-2xl">
          <p className="font-serif text-[clamp(2.8rem,4vw,4.7rem)] leading-[1.08] tracking-tight text-white">A clearer way to support every step forward.</p>
          <p className="mt-8 max-w-lg text-base leading-7 text-white/55">A workspace for professionals who need focus, continuity, and a complete view of the assessment process.</p>
        </blockquote>
        <div className="relative flex items-center gap-3 text-[11px] text-white/40"><span className="size-2 rounded-full bg-rust" /> Professional evaluation and tracking</div>
      </aside>
    </main>
  );
}
