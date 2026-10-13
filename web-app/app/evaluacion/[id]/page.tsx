import { Assessment } from "@/components/assessment";
import { requireSession } from "@/lib/auth-session";

export default async function AssessmentPage() {
  await requireSession();
  return <Assessment />;
}
