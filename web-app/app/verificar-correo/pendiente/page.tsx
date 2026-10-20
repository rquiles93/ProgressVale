import Link from "next/link";
import { EmailRequestForm } from "@/components/email-auth-forms";
import { AuthEmailPage } from "@/components/auth-email-page";

export default function PendingVerificationPage() { return <AuthEmailPage title="Verify your email"><p className="mb-6 text-sm leading-6 text-ink/60">Your registration request was accepted. Check your inbox for a verification link. If it does not arrive, request another email here.</p><EmailRequestForm kind="verification" /><Back /></AuthEmailPage>; }

function Back() { return <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-rust">Back to sign in</Link></p>; }
