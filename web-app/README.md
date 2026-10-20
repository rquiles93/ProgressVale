# ProgressVale

Aplicación local en desarrollo con Next.js, Better Auth, Prisma y PostgreSQL. Incluye clientes por usuario, evaluaciones históricas, Skills Tracking y exportaciones PDF privadas. Google OAuth queda desactivado hasta configurar un cliente real; consulta `docs/LOCAL_NETWORK_AND_GOOGLE_AUTH.md`.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Antes de iniciar, copia `.env.example` a un archivo `.env` local ignorado por Git y configura la base de datos dedicada, la URL de Better Auth y un secreto seguro.

La verificación de correo y recuperación de contraseña usan la API HTTP transaccional de Brevo. Configura `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` y `BREVO_SENDER_NAME` con un remitente autorizado. Sin las tres variables, el envío falla de forma segura. En producción, `BETTER_AUTH_URL` debe ser la URL pública HTTPS; los enlaces HTTP se limitan a localhost durante desarrollo.

La migración `20261019090000_add_email_verification_cohort` clasifica de manera persistente las cuentas: todos los usuarios existentes reciben `emailVerificationRequired = false`, mientras que el servidor marca como `true` únicamente los nuevos registros por contraseña. Así, las cuentas anteriores no quedan bloqueadas por un estado histórico `emailVerified = false`.

## Verificación

```bash
npm test
npm run test:integration
npm run test:auth
npm run test:pdf:integration
npx tsc --noEmit
npm run lint
npx prisma validate
npx prisma migrate status
npm run build
```

Las pruebas de integración requieren el servidor local y la base de datos aislada de ABLLS-R. Sólo crean datos ficticios temporales y los eliminan al finalizar.

## Operación

- Consulta `docs/BACKUP_AND_RECOVERY.md` para respaldos y ensayos de restauración.
- Consulta `docs/DEPLOYMENT_CHECKLIST.md` antes de preparar un entorno alojado.

No ejecutes restauraciones, migraciones destructivas ni despliegues sin una revisión explícita del entorno de destino.
