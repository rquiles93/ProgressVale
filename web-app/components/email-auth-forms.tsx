"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { requestPasswordResetAction, requestVerificationEmailAction, type EmailAuthState } from "@/app/actions/email-auth";
import { authClient } from "@/lib/auth-client";
import { validatePasswordReset } from "@/lib/password-reset-validation";

const initialState: EmailAuthState = { status: "idle", message: "" };

export function EmailRequestForm({ kind, defaultEmail = "" }: { kind: "verification" | "reset"; defaultEmail?: string }) {
  const action = kind === "verification" ? requestVerificationEmailAction : requestPasswordResetAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  if (kind === "reset" && state.status === "success") return <div role="status"><h2 className="font-serif text-2xl text-navy">Check your email</h2><p className="mt-4 text-sm leading-6 text-ink/60">If an eligible account exists for that address, you&apos;ll receive a password reset link.</p><p className="mt-2 text-sm leading-6 text-ink/60">The link is valid for 15 minutes.</p><Link href="/login" className="focus-ring mt-6 inline-flex rounded-xl bg-rust px-5 py-3 text-sm font-semibold text-white">Back to sign in</Link></div>;
  return <><form action={formAction} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Email</span><input name="email" type="email" defaultValue={defaultEmail} required maxLength={254} autoComplete="email" className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm" /></label>{state.message && <p role={state.status === "error" ? "alert" : "status"} className="rounded-xl bg-rust-soft/55 px-4 py-3 text-xs leading-5 text-rust-dark">{state.message}</p>}<button disabled={pending} className="focus-ring h-12 w-full rounded-xl bg-rust px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Processing…" : kind === "verification" ? "Send link" : "Reset password"}</button></form>{kind === "reset" && <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-rust">Back to sign in</Link></p>}</>;
}

export function ResetPasswordForm({ token, invalid = false }: { token?: string; invalid?: boolean }) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">(invalid || !token ? "error" : "idle");
  const [message, setMessage] = useState(invalid || !token ? "This link is invalid or expired. Request a new one." : "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationActive, setValidationActive] = useState(false);
  const errors = useMemo(() => validationActive ? validatePasswordReset(password, confirmation) : {}, [confirmation, password, validationActive]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setValidationActive(true);
    const validation = validatePasswordReset(password, confirmation);
    if (validation.password || validation.confirmation) { setStatus("error"); setMessage(""); return; }
    setStatus("pending");
    setMessage("");
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) { setStatus("error"); setMessage("This link is invalid or expired. Request a new one."); return; }
    setStatus("success"); setMessage("Password updated successfully.");
  }
  if (status === "success") return <div><p role="status" className="rounded-xl bg-rust-soft/55 px-4 py-3 text-sm text-rust-dark">{message}</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-rust px-5 py-3 text-sm font-semibold text-white">Sign in</Link></div>;
  return <form onSubmit={submit} noValidate className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-navy">New password</span><span className="relative block"><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} autoComplete="new-password" disabled={!token || invalid} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "new-password-error" : undefined} className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} disabled={!token || invalid} aria-label={showPassword ? "Hide new password" : "Show new password"} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/40 hover:text-navy disabled:opacity-40">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.password && <span id="new-password-error" role="alert" className="mt-2 block text-xs text-rust-dark">{errors.password}</span>}</label><label className="block"><span className="mb-2 block text-xs font-semibold text-navy">Confirm password</span><span className="relative block"><input name="confirmation" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required maxLength={128} autoComplete="new-password" disabled={!token || invalid} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? "confirm-password-error" : undefined} className="focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 pr-12" /><button type="button" onClick={() => setShowConfirmation((value) => !value)} disabled={!token || invalid} aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/40 hover:text-navy disabled:opacity-40">{showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.confirmation && <span id="confirm-password-error" role="alert" className="mt-2 block text-xs text-rust-dark">{errors.confirmation}</span>}</label>{message && <p role="alert" className="rounded-xl bg-rust-soft/55 px-4 py-3 text-xs leading-5 text-rust-dark">{message}</p>}<button disabled={status === "pending" || !token || invalid} className="h-12 w-full rounded-xl bg-rust text-sm font-semibold text-white disabled:opacity-60">{status === "pending" ? "Saving…" : "Save password"}</button></form>;
}
