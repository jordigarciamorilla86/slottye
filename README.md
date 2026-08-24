# Slotty

Plataforma de reservas construida con Next.js 16, TypeScript y Supabase SSR. Incluye área de clientes, gestión de negocios y agenda, reservas, notificaciones por correo, Google Maps y sincronización opcional con Google Calendar.

## Requisitos

- Node.js compatible con Next.js 16 (recomendado: Node.js 22 LTS).
- Un proyecto Supabase.
- Una cuenta de Vercel para el despliegue y los cron jobs.
- Upstash Redis o Vercel KV para el rate limiting en producción.
- Resend para el correo transaccional.
- Google Cloud si se habilitan Maps, Places, Geocoding o Calendar.

## Desarrollo local

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Completa `.env.local` con credenciales de desarrollo; no versionar este archivo ni copiar secretos a variables con prefijo `NEXT_PUBLIC_`.

Las variables disponibles y su finalidad están documentadas en `.env.example`. Las claves públicas de Maps deben restringirse por referrer y las claves de servidor por API y entorno desde Google Cloud.

## Base de datos

La fuente versionada del esquema es:

```text
supabase/migrations/20260811182658_remote_schema.sql
```

El archivo `supabase_schema.sql` de la raíz está vacío y se conserva únicamente como artefacto antiguo: **no debe ejecutarse ni utilizarse para restaurar la base de datos**.

Para un proyecto nuevo, instala Supabase CLI, enlaza el proyecto correcto y revisa la migración antes de aplicarla:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push --dry-run
supabase db push
```

No ejecutes `db push` contra producción sin revisar el `--dry-run`, disponer de copia de seguridad y confirmar que el proyecto enlazado es el correcto. La migración incluye funciones, triggers, políticas RLS y configuración de almacenamiento que forman parte del modelo de seguridad.

## Configuración de servicios

### Supabase Auth

En **Authentication > URL Configuration** configura:

- Local Site URL: `http://localhost:3000`
- Local redirect: `http://localhost:3000/auth/callback*`
- Production Site URL: `https://TU-DOMINIO`
- Production redirect: `https://TU-DOMINIO/auth/callback*`

Si habilitas Google como proveedor de Supabase Auth, configura en Google la URL callback que Supabase muestra en la pantalla del proveedor.

### Google Calendar

En producción, el callback OAuth y el webhook se construyen desde `NEXT_PUBLIC_APP_URL`; no configures aquí una URL de Preview. En Google Cloud:

- Activa Google Calendar API y configura la pantalla de consentimiento, el dominio y los usuarios de prueba si la aplicación sigue en modo Testing.
- Añade como URI de redirección autorizada la URL exacta `https://TU-DOMINIO/api/google-calendar/callback`, sin comodines.
- Añade el dominio de producción a los dominios autorizados y revisa que el scope solicitado sea `calendar.events`.
- Publica la aplicación OAuth cuando corresponda. En modo Testing, los refresh tokens pueden caducar y solo funcionan para usuarios de prueba.
- Restringe y rota el secreto OAuth si se ha compartido fuera del gestor de secretos. El ID y el secreto se configuran únicamente en Vercel, nunca con prefijo `NEXT_PUBLIC_`.

El webhook público es `POST https://TU-DOMINIO/api/google-calendar/webhook`. No se registra manualmente en Google Cloud: la aplicación crea canales `events.watch` y valida identificador de canal, recurso y token. El cron `/api/cron/google-calendar-watches` renueva los canales diariamente y debe devolver `success: true` con `failed: 0`.

El cliente OAuth debe aceptar estas redirecciones:

```text
http://localhost:3000/api/google-calendar/callback
https://TU-DOMINIO/api/google-calendar/callback
```

`NEXT_PUBLIC_APP_URL` debe ser HTTPS y coincidir con el dominio público para que los canales webhook apunten al entorno correcto.

### Resend

La aplicación envía desde `reservas@slottye.com` y, para algunos correos administrativos, `noreply@slottye.com`; ambos remitentes deben pertenecer a un dominio verificado en Resend. Revisa también que `contacto@slottye.com` y `privacidad@slottye.com` existan o redirijan a buzones atendidos.

- Configura `RESEND_API_KEY` solo en el servidor y usa claves distintas para Preview y Production.
- Espera a que Resend confirme SPF y DKIM y publica una política DMARC gradual antes de enviar correo real.
- Revisa entregas, rebotes, quejas y supresiones en el panel. El proyecto no expone actualmente un endpoint de webhooks de Resend.
- Haz el primer envío desde staging a cuentas controladas y confirma enlaces, remitente, Reply-To y carpeta de spam.

Verifica el dominio remitente y configura SPF, DKIM y DMARC antes de enviar correo real. Usa una clave distinta por entorno y comprueba entregas, rebotes y límites.

### Rate limiting y cron jobs

En Production deben existir `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `CRON_SECRET`, las variables de Supabase y las de KV. Usa credenciales separadas en Preview. Un callback OAuth de Preview requiere registrar explícitamente esa URI y no debe sustituir el dominio canónico de Production.

`KV_REST_API_URL` y `KV_REST_API_TOKEN` son obligatorias en producción para las rutas que usan el limitador. `CRON_SECRET` debe ser aleatorio, largo y configurarse en Vercel; nunca debe exponerse al navegador.

Los horarios están versionados en `vercel.json`. Ambos cron se ejecutan una vez al día, por lo que son compatibles con Hobby; en ese plan Vercel puede iniciarlos en cualquier momento dentro de la hora programada. Si `CRON_SECRET` está configurado, Vercel envía automáticamente `Authorization: Bearer <CRON_SECRET>`.

Después del despliegue, abre **Settings > Cron Jobs** y confirma que los dos trabajos están habilitados. Revisa que sus ejecuciones respondan `2xx`; una petición manual sin cabecera de autorización debe responder `401`. No escribas el secreto en logs ni en comandos que queden guardados en el historial del shell.

### Estado del servicio

`GET /api/health` comprueba la configuración pública mínima de Supabase y una consulta ligera a la base de datos. Devuelve `200` con estado `ok` o `503` con estado `degraded`, sin incluir credenciales ni detalles internos del error. Configura un monitor externo contra esta ruta y alerta ante respuestas distintas de `200`; la respuesta lleva `Cache-Control: no-store`.

## Comprobaciones antes de desplegar

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm audit
git diff --check
```

`npm run check` agrupa lint, typecheck, pruebas unitarias y build. El workflow `.github/workflows/ci.yml` ejecuta las comprobaciones principales en cada pull request y cada push a `main`.

Checklist de release:

- Aplicar y verificar migraciones, RLS, funciones y políticas de Storage.
- Configurar todas las variables de `.env.example` en el entorno correcto.
- En Vercel, asignar las credenciales reales solo a Production; usar proyectos o credenciales separadas para Preview y Development. `NEXT_PUBLIC_APP_URL` debe coincidir con el dominio de cada entorno que use callbacks o webhooks.
- Confirmar que ninguna service role, clave de Resend o secreto OAuth aparece en el cliente o repositorio.
- Revisar URLs de Supabase Auth y callbacks de Google para el dominio final.
- Restringir las API keys de Google y revisar cuotas/facturación.
- Verificar dominio de correo, SPF, DKIM y DMARC.
- Revisar `vercel.json`, el secreto de cron y las ejecuciones de recordatorios.
- Comprobar que `GET /api/health` responde `200`, `status: ok` y no expone datos internos.
- Ejecutar build, typecheck, lint, tests, auditoría de dependencias y smoke tests.
- Revisar cabeceras CSP en el navegador: no debe haber recursos legítimos bloqueados.
- Probar registro, login, recuperación de contraseña, reserva, cancelación, reprogramación y eliminación de cuenta.
- Probar agenda de negocio, Google Calendar y correos en un entorno de staging.
- Confirmar copias de seguridad y ensayar una restauración de Supabase.
- Activar monitorización de errores y alertas antes de recibir usuarios reales.

## Cabeceras de seguridad

`next.config.ts` aplica CSP, HSTS, protección frente a MIME sniffing y clickjacking, una política de referrer y permisos restringidos. La CSP permite únicamente los orígenes necesarios para Supabase y Google Maps, además de los estilos y scripts inline que el renderizado actual de Next.js/styled-jsx necesita.

Tras cada incorporación de un proveedor externo, revisa primero los errores CSP en staging. Como endurecimiento futuro, implanta nonces por petición y elimina `'unsafe-inline'` de `script-src` y, cuando el CSS lo permita, de `style-src`.

## Despliegue

1. Crea un entorno de staging separado de producción.
2. Configura las variables en Vercel distinguiendo Development, Preview y Production.
3. Aplica migraciones al proyecto Supabase del entorno.
4. Despliega staging y completa el checklist funcional.
5. Revisa logs, CSP, webhooks, crons y entrega de correo.
6. Promueve a producción únicamente con el árbol Git limpio y un commit etiquetado.
