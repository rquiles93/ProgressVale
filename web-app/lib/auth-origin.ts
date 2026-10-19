type AuthEnvironment = Partial<Pick<NodeJS.ProcessEnv, "BETTER_AUTH_URL" | "BETTER_AUTH_DEV_HOSTS" | "NODE_ENV">>;

const SAFE_DEV_HOST = /^(?:localhost|127\.0\.0\.1|(?:10|192\.168)\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})$/;

export function developmentAuthHosts(rawHosts: string | undefined) {
  const configured = (rawHosts ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  const invalid = configured.filter((host) => !SAFE_DEV_HOST.test(host));
  if (invalid.length) throw new Error("BETTER_AUTH_DEV_HOSTS accepts only exact localhost or private-LAN hosts with ports.");
  return [...new Set(["localhost:3000", "127.0.0.1:3000", ...configured])];
}

export function betterAuthBaseURL(environment: AuthEnvironment = process.env) {
  if (environment.NODE_ENV === "production") return environment.BETTER_AUTH_URL;
  return {
    allowedHosts: developmentAuthHosts(environment.BETTER_AUTH_DEV_HOSTS),
    protocol: "http" as const,
    ...(environment.BETTER_AUTH_URL ? { fallback: environment.BETTER_AUTH_URL } : {}),
  };
}
