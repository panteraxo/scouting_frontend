# Academias y clubes — resumen del contrato

La fuente canónica es `docs/api/organizaciones.md` (SCP-003). Este archivo solo
resume lo que implementa el frontend; no define supuestos ni campos propios.

## Rutas usadas

- Admin: `/admin/academies`, `/admin/academies/{id}`, `deactivate`,
  `reactivate`, `verification`; espejo en `/admin/clubs`.
- Propia: `GET/PUT /academies/me`, `PATCH /academies/me/deactivate`; espejo en
  `/clubs/me`.
- Consulta de solo lectura: `GET /directory/academies`,
  `/directory/academies/{id}`; espejo en `/directory/clubs`. Roles `ADMIN` y
  `SCOUT`.
- UBIGEO: `/ubigeo/departments`, `/ubigeo/provinces?departmentCode=NN`,
  `/ubigeo/districts?provinceCode=NNNN`.

Todas las escrituras usan `apiMutation` (cookie `HttpOnly` + CSRF centralizado);
las lecturas usan `apiRequest`.

## Tipos y cuerpos

- `OrganizationResponse`: respuesta completa de academia o club (ADMIN y alcance
  propio), con `operationalStatus`, `verificationStatus`, RUC y datos de
  representante/responsables.
- `AcademyDirectoryResponse` y `ClubDirectoryResponse`: respuestas de solo
  lectura sin estados internos, RUC, representante ni responsables. El backend
  solo devuelve organizaciones `ACTIVE + VERIFIED` en estas rutas.
- `OrganizationInput`: cuerpo de creación/edición. Envía un único `ubigeoCode`
  (distrito de 6 dígitos) y nunca códigos separados de departamento/provincia.
  Para academia incluye `headquarters`. `trainingGroups` sigue existiendo en el
  contrato del backend, pero la interfaz ya no lo captura ni lo envía.
  `representativeName` es opcional y legacy: el nombre mostrado se deriva de la
  cuenta activa con rol `ACADEMY_DIRECTOR` asignada a la academia. Para club no
  se envían responsables ni cargo; `countryCode` lo fija el backend.
- `OrganizationListQuery`: `page`, `size`, `sort`, `q`, `type`, `ubigeo`,
  `operationalStatus`, `verificationStatus`.
- `DirectoryQuery`: `page`, `size`, `sort`, `q`, `type`, `ubigeo`.

## Filtros de ubicación

- `ubigeo` acepta prefijos de 2 (departamento), 4 (provincia) o 6 (distrito)
  dígitos.
- El listado admin permite escribir el prefijo directamente.
- El módulo de consulta usa selects en cascada y envía el prefijo del nivel
  seleccionado: distrito si existe, si no provincia, si no departamento.

## Mapeos de interfaz

- Acción visual de verificación → body `{ status }`:
  `VERIFY` → `VERIFIED`, `REJECT` → `REJECTED`,
  `REOPEN`/`REVOKE` → `PENDING_VERIFICATION`.
- `operationalStatus`: `ACTIVE` / `INACTIVE`.
- `verificationStatus`: `PENDING_VERIFICATION` / `VERIFIED` / `REJECTED`.
- Los conteos `counts.*` con `null` se muestran como `—`; nunca como cero.
- La vista de solo lectura no evalúa estados en el cliente: la API ya los filtra
  y responde `404` para organizaciones no disponibles.

Si el contrato cambia, actualizar `src/types/api.ts` y
`src/features/organizations/organizations-api.ts` junto con
`docs/api/organizaciones.md`.
