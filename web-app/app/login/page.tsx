import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { googleOAuthConfigured, normalizeGoogleOAuthError, requiresGoogleAccountLink } from "@/lib/google-auth-flow";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; linkGoogle?: string }> }) {
  if (await getSession()) redirect("/clientes");
  const query = await searchParams;
  const oauthError = normalizeGoogleOAuthError(query.error);
  return <AuthForm mode="login" googleEnabled={googleOAuthConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)} oauthError={oauthError} linkGoogleRequested={requiresGoogleAccountLink(oauthError, query.linkGoogle === "1")} />;
}
