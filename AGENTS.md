# Instrucciones frontend

Lee el `AGENTS.md` raíz. Implementa cambios únicamente en frontend salvo autorización explícita.
- Next.js App Router y TypeScript estricto.
- Mensajes visibles en español.
- Mantener páginas, features, componentes y acceso API separados.
- Formularios con validación y estados de carga/error/éxito.
- Nunca poner secretos en variables `NEXT_PUBLIC_*`.
- No asumir que ocultar una acción equivale a proteger el recurso.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
