# Jugadores e historial — resumen de implementación

Fuente canónica: `docs/api/jugadores.md` (SCP-005). Este archivo solo resume las
rutas y decisiones de interfaz; no define campos ni reglas propias.

## Rutas backend consumidas

- `GET /players` con filtros `page`, `size`, `sort`, `q`, `position`,
  `positionGroup`, `ageMin`, `ageMax`, `regionCode`, `provinceCode`,
  `districtCode`, `academyId`, `operationalStatus`, `profileStatus`.
- `POST /players/with-account` (SCP-015): alta conjunta de cuenta PLAYER y perfil;
  responde `{ player, temporaryPassword, temporaryPasswordExpiresAt }`. La
  pantalla `Jugadores → Nuevo jugador` usa este endpoint y ya no busca cuentas
  candidatas. `GET /players/account-candidates` y `POST /players` siguen
  existiendo en la API, pero no se usan desde la interfaz.
- `GET /players/me`, `GET /players/{id}`, `PUT /players/{id}`.
- `PATCH /players/{id}/status` con `{ status: "ACTIVE" | "INACTIVE" }`.
- `GET/PUT /players/{id}/guardian`, `PUT /players/{id}/guardian/consent`.
- `GET/POST /players/{id}/history`, `GET/PUT /players/{id}/history/{historyId}`.
- `GET /players/{id}/stats`.

Todas las lecturas usan `apiRequest` con `cache: "no-store"`; las escrituras usan
`apiMutation` con el CSRF centralizado.

## Proyecciones por rol

- ADMIN: `PlayerAdminDetailResponse`. No accede a `/guardian`.
- Director/Profesor: `PlayerStaffDetailResponse` para su academia.
- SCOUT: `PlayerScoutDetailResponse`; solo perfiles activos/completos y academia
  operativamente activa. La ficha muestra el estado de verificación de la
  academia.
- PLAYER: `PlayerOwnResponse` en `/mi-perfil`; sin edición ni tutor.

El listado de SCOUT no envía `operationalStatus`, `profileStatus` ni
`districtCode` porque la API los rechaza. No se evalúan esos estados en cliente.

`PlayerDirectoryItemResponse` incluye `heightCm` y `weightKg`, por lo que las
tarjetas del listado pueden mostrarlos sin inventar valores. Si el perfil no
registra alguno, la API omite el campo y la tarjeta muestra "—". La ficha del
jugador sigue siendo la vía para el detalle físico completo.

## Formularios

- El alta envía en un solo request la identidad de la cuenta
  (`firstName`, `lastName`, `documentType`, `documentNumber`, `email`, `phone`,
  `username`) y los datos del perfil. El rol PLAYER lo fija el servidor.
- Solo ADMIN envía `academyId`; para Director/Profesor la academia se deriva de
  la sesión y no se envía el campo.
- La contraseña temporal se muestra una sola vez con `TemporaryPasswordPanel` y
  no se guarda en almacenamiento del navegador.
- El request de perfil envía un único `residenceUbigeoCode` de 6 dígitos; la
  cascada UBIGEO es solo de interfaz.
- Años de experiencia, estados, autoría y tutor no se envían desde el formulario
  de perfil.
- La corrección de historial envía `expectedVersion` y `correctionReason`; no se
  envía autor y no existe acción de borrado.
- Las métricas posicionales se envían solo para el grupo de `positionPlayed`.
- El consentimiento usa `{ status, evidenceUrl, note }` y no admite
  `NOT_RECORDED` como entrada.
