# Local network and Google authentication

## Phone access during local development

Run Next.js on all local interfaces:

```bash
npm run dev -- --hostname 0.0.0.0
```

Find the Windows PC's current private IPv4 address with `ipconfig`, then add its exact host and port to the ignored `.env` file:

```dotenv
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_DEV_HOSTS="172.20.8.55:3000"
```

Restart the development server after changing `.env`, then open `http://<current-private-ip>:3000` on the phone. Multiple exact private hosts may be comma-separated. Wildcards, public hosts, URL schemes, and paths are rejected. This development option does not change the canonical production origin or production cookie security.

If the IP changes, update `BETTER_AUTH_DEV_HOSTS` and restart Next.js. Windows Firewall must allow Node.js on the private network profile, and both devices must be on the same local network.

## Google sign-in

Google support is implemented but remains disabled until both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured outside Git.

In Google Cloud Console:

1. Configure the OAuth consent screen with only basic identity scopes: `openid`, `email`, and `profile`.
2. Create an OAuth 2.0 Client ID of type **Web application**.
3. Add `http://localhost:3000/api/auth/callback/google` as the local authorized redirect URI.
4. Add the final canonical HTTPS callback, `https://<production-domain>/api/auth/callback/google`, before deployment.
5. Store the issued client ID and secret in the local `.env` or the production secret manager, then restart the application.

Google does not accept arbitrary private-LAN HTTP callback origins as a production web OAuth configuration. Use the localhost callback during local OAuth testing and the canonical HTTPS origin in production. Email/password authentication remains available over an explicitly allowlisted private-LAN development origin.

An existing password user must sign in first and connect Google from **Perfil y seguridad**. Automatic implicit linking is disabled, different emails cannot be linked, and unlinking the final sign-in method is prohibited.
