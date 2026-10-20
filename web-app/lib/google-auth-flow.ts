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

export function googleOAuthErrorMessage(error: string | undefined) {
  switch (error) {
    case "access_denied":
      return "You cancelled Google sign-in. No changes were made.";
    case GOOGLE_UNVERIFIED_EMAIL:
    case "email_not_verified":
      return "Google must verify your email before it can be used to sign in.";
    case "account_already_linked_to_different_user":
      return "This Google identity is already linked to another account.";
    case "email_does_not_match":
      return "The Google email does not match this account.";
    case undefined:
      return "";
    default:
      return "Google sign-in could not be completed. Please try again.";
  }
}
