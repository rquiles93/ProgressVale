import Link from "next/link";
import { AuthEmailPage } from "@/components/auth-email-page";
import { consumeOneTimeVerificationToken } from "@/lib/auth-emails";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token = "" } = await searchParams; const result = await consumeOneTimeVerificationToken(token); const text = result === "verified" ? "Email verified. You can now sign in." : result === "expired" ? "The link expired. Request a new one." : "The link is invalid or has already been used."; return <AuthEmailPage title="Email verification"><p role="status" className="rounded-xl bg-rust-soft/55 px-4 py-4 text-sm leading-6 text-rust-dark">{text}</p><p className="mt-6 text-center text-sm"><Link href={result === "verified" ? "/login" : "/verificar-correo/pendiente"} className="font-semibold text-rust">{result === "verified" ? "Sign in" : "Request another link"}</Link></p></AuthEmailPage>; }
