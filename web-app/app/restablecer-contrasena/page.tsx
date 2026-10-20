import Link from "next/link";
import { ResetPasswordForm } from "@/components/email-auth-forms";
import { AuthEmailPage } from "@/components/auth-email-page";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) { const query = await searchParams; return <AuthEmailPage title="New password"><ResetPasswordForm token={query.token} invalid={Boolean(query.error)} /><p className="mt-6 text-center text-sm"><Link href="/recuperar-contrasena" className="font-semibold text-rust">Request another link</Link></p></AuthEmailPage>; }
