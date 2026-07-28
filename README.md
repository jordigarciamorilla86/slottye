# Slotty

Starter de Slotty con Next.js 16, TypeScript y Supabase SSR.

## 1. Instalar

```bash
npm install
```

## 2. Crear proyecto en Supabase

1. Crea un proyecto en https://database.new
2. Abre **SQL Editor** y ejecuta `supabase/schema.sql` completo.
3. En **Connect** copia Project URL y Publishable key.

Crea `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No necesitas `SUPABASE_SERVICE_ROLE_KEY` para autenticación normal. No la expongas nunca en variables `NEXT_PUBLIC_*`.

## 3. Configurar URLs de Auth

En Supabase > Authentication > URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback*`

Cuando despleguemos en Vercel añadiremos también el dominio real.

## 4. Google SSO (opcional en este bloque)

En Supabase > Authentication > Providers > Google activa Google y añade las credenciales OAuth de Google Cloud. La callback que Google debe aceptar es la que muestra Supabase en esa pantalla.

## 5. Ejecutar

```bash
npm run dev
```

Abre http://localhost:3000

## Flujo ya implementado

- Registro email/password como cliente o negocio.
- Login email/password.
- Google OAuth preparado.
- Callback OAuth.
- Perfil automático en `public.profiles`.
- Roles `customer`, `business`, `admin` con protección para evitar autoescalado a admin.
- Sesiones SSR mediante cookies y `proxy.ts` de Next.js 16.
- Página `/account` protegida.

## Próximo bloque

- Alta/edición de ficha de negocio.
- Dashboard Business.
- Lectura real de categorías/negocios desde Supabase.
