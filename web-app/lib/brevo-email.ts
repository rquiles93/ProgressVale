import "server-only";

import { deliverBrevoEmail, readBrevoConfiguration, type TransactionalEmail } from "@/lib/brevo-email-core";

export async function sendBrevoTransactionalEmail(message: TransactionalEmail, fetcher: typeof fetch = fetch) {
  await deliverBrevoEmail(readBrevoConfiguration(process.env), message, fetcher);
}
