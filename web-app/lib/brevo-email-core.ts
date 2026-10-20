export type BrevoConfiguration = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
};

export type TransactionalEmail = {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
};

export class EmailDeliveryError extends Error {
  readonly reason: "missing_configuration" | "delivery_failed";

  constructor(reason: "missing_configuration" | "delivery_failed") {
    super("Transactional email delivery is unavailable.");
    this.name = "EmailDeliveryError";
    this.reason = reason;
  }
}

export function readBrevoConfiguration(environment: NodeJS.ProcessEnv): BrevoConfiguration | null {
  const apiKey = environment.BREVO_API_KEY?.trim();
  const senderEmail = environment.BREVO_SENDER_EMAIL?.trim();
  const senderName = environment.BREVO_SENDER_NAME?.trim();
  if (!apiKey || !senderEmail || !senderName) return null;
  return { apiKey, senderEmail, senderName };
}

export function createBrevoRequest(configuration: BrevoConfiguration, message: TransactionalEmail) {
  return {
    url: "https://api.brevo.com/v3/smtp/email",
    init: {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": configuration.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: configuration.senderEmail, name: configuration.senderName },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.htmlContent,
        textContent: message.textContent,
      }),
    } satisfies RequestInit,
  };
}

export async function deliverBrevoEmail(configuration: BrevoConfiguration | null, message: TransactionalEmail, fetcher: typeof fetch = fetch, timeoutMs = 10_000) {
  if (!configuration) throw new EmailDeliveryError("missing_configuration");
  const request = createBrevoRequest(configuration, message);
  let response: Response;
  try {
    response = await fetcher(request.url, { ...request.init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new EmailDeliveryError("delivery_failed");
  }
  if (!response.ok) throw new EmailDeliveryError("delivery_failed");
}
