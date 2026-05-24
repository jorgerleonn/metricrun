<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase

Las variables de entorno necesarias están en `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key del proyecto Supabase

Copia `.env.example` a `.env.local` y rellena los valores antes de ejecutar.

La tabla `runs` se crea ejecutando `supabase/schema.sql` en el SQL Editor de Supabase.

## Clerk

Regístrate en https://clerk.com y crea una aplicación. Copia las keys al `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Las rutas de autenticación están en `/sign-in` y `/sign-up`.
