import { AppHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { displayName: true, email: true, emailVerified: true, createdAt: true, identities: { select: { provider: true }, orderBy: { createdAt: "asc" } } },
  });
  const providers = [...new Set(user.identities.map((identity) => identity.provider))];
  return <div className="min-h-screen bg-cream"><AppHeader user={{ name: session.user.name, email: session.user.email }} back={{ href: "/clientes", label: "Mis clientes" }} /><ProfileForm user={{ name: user.displayName, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString(), providers }} googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} /></div>;
}
