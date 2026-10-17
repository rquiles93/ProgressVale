import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getSession()) redirect("/clientes");
  return <AuthForm mode="login" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
