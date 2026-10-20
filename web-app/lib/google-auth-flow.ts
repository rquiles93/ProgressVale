export const GOOGLE_ACCOUNT_NOT_LINKED = "account_not_linked";
export const GOOGLE_UNVERIFIED_EMAIL = "google_email_not_verified";

const KNOWN_GOOGLE_OAUTH_ERRORS = new Set([
  GOOGLE_ACCOUNT_NOT_LINKED,
  GOOGLE_UNVERIFIED_EMAIL,
  "access_denied",
  "account_already_linked_to_different_user",
  "email_does_not_match",
  "email_not_found",
  "email_not_verified",
  "invalid_code",
  "no_code",
  "state_not_found",
  "unable_to_get_user_info",
  "unable_to_link_account",
]);

type OAuthValidationData = {
  user: { emailVerified?: boolean | null };
  source: {
    method: string;
    oauth?: { providerId?: string };
  };
};

export function googleOAuthConfigured(clientId: string | undefined, clientSecret: string | undefined) {
  return Boolean(clientId?.trim() && clientSecret?.trim());
}

export function validateGoogleOAuthUserInfo({ user, source }: OAuthValidationData) {
  if (source.method !== "oauth" || source.oauth?.providerId !== "google") return;
  if (user.emailVerified === true) return;

  return {
    error: GOOGLE_UNVERIFIED_EMAIL,
    errorDescription: "Google must verify the email address before it can be used for authentication.",
  };
}

export function normalizeGoogleOAuthError(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && KNOWN_GOOGLE_OAUTH_ERRORS.has(candidate) ? candidate : candidate ? "oauth_error" : undefined;
}

export function requiresGoogleAccountLink(error: string | undefined, requested = false) {
  return requested || error === GOOGLE_ACCOUNT_NOT_LINKED;
}

export function googleOAuthErrorMessage(error: string | undefined, language: "EN" | "ES" = "EN") {
  const localized = (english: string, spanish: string) => language === "ES" ? spanish : english;
  switch (error) {
    case "access_denied":
      return localized("You cancelled Google sign-in. No changes were made.", "Cancelaste el acceso con Google. No se realizó ningún cambio.");
    case GOOGLE_UNVERIFIED_EMAIL:
    case "email_not_verified":
      return localized("Google must verify your email before it can be used to sign in.", "Google debe verificar tu correo antes de que pueda usarse para iniciar sesión.");
    case "account_already_linked_to_different_user":
      return localized("This Google identity is already linked to another account.", "Esta identidad de Google ya está vinculada a otra cuenta.");
    case "email_does_not_match":
      return localized("The Google email does not match this account.", "El correo de Google no coincide con esta cuenta.");
    case undefined:
      return "";
    default:
      return localized("Google sign-in could not be completed. Please try again.", "No se pudo completar el acceso con Google. Inténtalo de nuevo.");
  }
}
