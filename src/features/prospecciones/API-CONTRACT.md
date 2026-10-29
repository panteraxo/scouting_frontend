# Prospecciones y evaluaciones — resumen frontend

Fuente canónica: `docs/api/prospecciones.md` (SCP-006). Este archivo solo
resume lo implementado y las limitaciones observadas.

## Rutas backend consumidas

- `GET /prospects` con `page`, `size`, `sort`, `status`, `playerId`, `q`.
- `POST /prospects` con `{ playerId, privateNotes }`.
- `GET /prospects/{id}`.
- `PATCH /prospects/{id}` con `{ privateNotes, version }`.
- `PATCH /prospects/{id}/status` con `{ status, version }`.
- `GET /prospects/{id}/evaluations`.
- `POST /prospects/{id}/evaluations`.

Todas las lecturas usan `apiRequest` con `cache: "no-store"`; las escrituras usan
`apiMutation` con CSRF centralizado.

## Restricciones de interfaz

- Solo `SCOUT` accede a `/prospecciones`, `/prospecciones/nueva`,
  `/prospecciones/{id}` y `/prospecciones/{id}/evaluaciones/nueva`.
- ADMIN, staff de academia, club y jugador no ven enlaces ni contenido, y las
  rutas directas muestran acceso restringido.
- Las notas privadas y evaluaciones solo se renderizan en las pantallas del
  ojeador autor.
- El listado no muestra conteos de evaluaciones porque la API no expone
  agregados.
- No se implementa SCP-007.

## Limitación observada

`ProspectEvaluationResponse` no incluye un campo de autor; solo `createdAt`. La
interfaz muestra la fecha de creación y atribuye la evaluación al ojeador
autenticado, ya que la API solo permite crearlas al autor de la prospección. No
se inventa un DTO ni un identificador de autor.
