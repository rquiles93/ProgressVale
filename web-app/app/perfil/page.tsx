import { AppHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { googleOAuthConfigured, normalizeGoogleOAuthError } from "@/lib/google-auth-flow";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ linkGoogle?: string; googleLinked?: string; error?: string | string[] }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { displayName: true, email: true, emailVerified: true, emailVerificationRequired: true, createdAt: true, identities: { select: { provider: true }, orderBy: { createdAt: "asc" } } },
  });
  const providers = [...new Set(user.identities.map((identity) => identity.provider))];
  return <div className="min-h-screen bg-cream"><AppHeader user={{ name: session.user.name, email: session.user.email }} back={{ href: "/clientes", label: "Mis clientes" }} /><ProfileForm user={{ name: user.displayName, email: user.email, emailVerified: user.emailVerified, emailVerificationRequired: user.emailVerificationRequired, createdAt: user.createdAt.toISOString(), providers }} googleEnabled={googleOAuthConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)} linkGoogleRequested={query.linkGoogle === "1"} googleLinked={query.googleLinked === "1"} oauthError={normalizeGoogleOAuthError(query.error)} /></div>;
}
