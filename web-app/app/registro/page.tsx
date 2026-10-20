import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { googleOAuthConfigured, normalizeGoogleOAuthError } from "@/lib/google-auth-flow";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  if (await getSession()) redirect("/clientes");
  const query = await searchParams;
  return <AuthForm mode="register" googleEnabled={googleOAuthConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)} oauthError={normalizeGoogleOAuthError(query.error)} />;
}
