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

Use a separate OAuth client for ProgressVale. Do not reuse or modify the DataViz OAuth client.

In Google Cloud Console:

1. In **APIs & Services → OAuth consent screen**, configure the app and request only `openid`, `email`, and `profile`. If the app is in Testing, add each intended tester as a test user.
2. In **Credentials**, create an **OAuth 2.0 Client ID** of type **Web application** specifically for ProgressVale.
3. Add `http://localhost:3000` as the local authorized JavaScript origin.
4. Add `http://localhost:3000/api/auth/callback/google` as the local authorized redirect URI. This is Better Auth's actual callback route.
5. For production, add only the canonical HTTPS origin and `https://<production-domain>/api/auth/callback/google`; do not add wildcard origins.
6. Store the issued client ID and secret as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the ignored local `.env` or production secret manager, set `BETTER_AUTH_URL` to the matching canonical origin, and restart the application.

Google does not accept arbitrary private-LAN HTTP callback origins as a production web OAuth configuration. Use the localhost callback during local OAuth testing and the canonical HTTPS origin in production. Email/password authentication remains available over an explicitly allowlisted private-LAN development origin.

New users with a Google-verified email may create a Google-only account. If the verified email already belongs to a password account, automatic linking remains disabled: the user must confirm the ProgressVale password, then repeat Google verification from **Perfil y seguridad**. Different emails cannot be linked, a Google identity already owned by another user is rejected, and unlinking the final sign-in method is prohibited.

Google OAuth is not supported through an arbitrary private-LAN HTTP callback. Start and finish Google OAuth at `http://localhost:3000`; use the exact canonical HTTPS origin in production. Email/password authentication remains available over an explicitly allowlisted private-LAN development origin.
