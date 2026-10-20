import { EmailRequestForm } from "@/components/email-auth-forms";
import { AuthEmailPage } from "@/components/auth-email-page";

export default function RecoveryPage() { return <AuthEmailPage title="Reset password"><p className="mb-6 text-sm leading-6 text-ink/60">Request a link valid for 15 minutes. The response does not confirm whether an account exists.</p><EmailRequestForm kind="reset" /></AuthEmailPage>; }
