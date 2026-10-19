import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; oauthError?: string }> }) {
  if (await getSession()) redirect("/clientes");
  const query = await searchParams;
  return <AuthForm mode="login" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} oauthError={Boolean(query.error || query.oauthError)} />;
}
