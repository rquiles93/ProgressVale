# Aplicación ABLLS-R

Aplicación local en desarrollo con Next.js, Better Auth, Prisma y PostgreSQL. Incluye clientes por usuario, evaluaciones históricas, Skills Tracking y exportaciones PDF privadas. Google OAuth y recuperación de contraseña permanecen desactivados hasta configurar proveedores reales.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Antes de iniciar, copia `.env.example` a un archivo `.env` local ignorado por Git y configura la base de datos dedicada, la URL de Better Auth y un secreto seguro.

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
