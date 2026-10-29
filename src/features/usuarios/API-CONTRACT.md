# Contrato de API usado por el frontend — Usuarios (SCP-004)

Documento de trabajo del frontend. El contrato oficial está en
`docs/api/usuarios.md`. Al implementar la pantalla ese archivo aún no existía; se
usó el contrato entregado en la tarea y después se contrastó con los DTOs del
backend (`AdminUserController`, `AcademyUserController`, `UserSummaryResponse`,
`UserDetailResponse`, `UserCreatedResponse`). Este documento resume el contrato
consumido y no reemplaza la documentación oficial.

## Rutas usadas

| Operación | Método y ruta | Rol de interfaz |
|---|---|---|
| Listar | `GET /admin/users` | ADMIN |
| Crear | `POST /admin/users` | ADMIN |
| Detalle | `GET /admin/users/{id}` | ADMIN |
| Editar identidad | `PUT /admin/users/{id}` | ADMIN |
| Cambiar rol/asignación | `PATCH /admin/users/{id}/assignment` | ADMIN |
| Activar/inhabilitar | `PATCH /admin/users/{id}/status` | ADMIN |
| Reset de contraseña | `POST /admin/users/{id}/reset-password` | ADMIN |
| Alta en academia propia | `POST /academies/me/users` | ACADEMY_DIRECTOR (PROFESSOR ya no crea cuentas) |

Todas las escrituras pasan por `apiMutation`, que obtiene y envía el CSRF
centralizado (`X-CSRF-TOKEN`). Ninguna pantalla usa `fetch` directo.

## Listado

`GET /admin/users` devuelve `PageResponse<UserSummaryResponse>`:

```json
{
  "content": [
    {
      "id": 1,
      "firstName": "Nombre",
      "lastName": "Apellido",
      "username": "usuario",
      "email": "usuario@ejemplo.com",
      "role": "PLAYER",
      "status": "ACTIVE",
      "academyId": 1,
      "academyCode": "ACA-000001",
      "academyName": "Academia Ejemplo",
      "clubId": null,
      "clubCode": null,
      "clubName": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Parámetros enviados: `page`, `size`, `q`, `role`, `status`, `academyId`, `clubId`.
El filtro `status` solo usa `ACTIVE` e `INACTIVE`; la API rechaza
`PENDING_APPROVAL` en este listado. Las solicitudes pendientes se gestionan en
`/admin/solicitudes-ojeador`. La lista no incluye documento ni teléfono.

## Detalle

`GET /admin/users/{id}` devuelve `UserDetailResponse`:

```json
{
  "id": 1,
  "firstName": "Nombre",
  "lastName": "Apellido",
  "documentType": "DNI",
  "documentNumber": "12345678",
  "email": "usuario@ejemplo.com",
  "phone": null,
  "username": "usuario",
  "role": "PLAYER",
  "status": "ACTIVE",
  "mustChangePassword": true,
  "temporaryPasswordExpiresAt": "2026-10-20T22:00:00Z",
  "academyId": 1,
  "academyCode": "ACA-000001",
  "academyName": "Academia Ejemplo",
  "clubId": null,
  "clubCode": null,
  "clubName": null,
  "position": null,
  "createdAt": "2026-10-19T22:00:00Z",
  "updatedAt": "2026-10-19T22:00:00Z"
}
```

Nunca incluye contraseña ni hash. Las cuentas `PENDING_APPROVAL` no admiten
edición, asignación, cambio de estado ni reseteo desde estos endpoints.

## Alta

El request no incluye contraseña ni organización para roles que no la requieren.
Desde SCP-015 el módulo Usuarios **no crea cuentas PLAYER**: `POST /admin/users`
responde `400 INVALID_ROLE` y `POST /academies/me/users` responde
`403 ROLE_NOT_ALLOWED` para ese rol. La cuenta del jugador se crea junto con su
perfil mediante `POST /players/with-account` (ver
`features/jugadores/API-CONTRACT.md`).

Roles ofrecidos en el alta administrativa: ADMIN, ACADEMY_DIRECTOR, PROFESSOR,
CLUB_MANAGER y SCOUT. En el alta con alcance de academia, el Director solo crea
PROFESSOR; el Profesor no tiene roles creables y la pantalla muestra un estado
informativo con enlace a `Jugadores → Nuevo jugador`.

```json
{
  "firstName": "Nombre",
  "lastName": "Apellido",
  "documentType": "DNI",
  "documentNumber": "12345678",
  "email": "usuario@ejemplo.com",
  "phone": null,
  "username": "usuario",
  "role": "PROFESSOR",
  "academyId": 1
}
```

- `CLUB_MANAGER` envía `clubId` y, opcionalmente, `position`; no envía `academyId`.
- `ADMIN` y `SCOUT` no envían organización ni cargo.
- El alta con alcance de academia (`/academies/me/users`) no envía `academyId`,
  `clubId` ni `position`; el servidor usa la academia del usuario autenticado.
- `position` es opcional en el backend actual; la interfaz lo muestra únicamente
  para `CLUB_MANAGER`.
- La respuesta es `UserCreatedResponse`:
  `{ user, temporaryPassword, temporaryPasswordExpiresAt }`, donde `user` es un
  `UserSummaryResponse`. La contraseña permanece solo en el estado de React de la
  pantalla y desaparece al salir o recargar. No se escribe en `localStorage`,
  `sessionStorage` ni logs. El servidor envía `Cache-Control: no-store`.

## Edición, asignación y estado

- `PUT /admin/users/{id}` se usa solo para identidad: nombres, apellidos, tipo y
  número de documento, correo, teléfono opcional y nombre de usuario.
- `PATCH /admin/users/{id}/assignment` recibe
  `{ role, academyId?, clubId?, position? }`. `position` solo se envía para
  `CLUB_MANAGER`.
- `PATCH /admin/users/{id}/status` recibe `{ "status": "ACTIVE" | "INACTIVE" }`.
- `POST /admin/users/{id}/reset-password` devuelve `UserCreatedResponse`. Como su
  `user` es un resumen, el detalle se recarga después del reseteo para conservar
  documento, teléfono y marcas de tiempo.

## Dependencias de SCP-003

Para los selectores de organización se reutilizan:

- `GET /admin/academies?operationalStatus=ACTIVE&size=100&sort=name,asc`
- `GET /admin/clubs?operationalStatus=ACTIVE&size=100&sort=name,asc`
- `GET /academies/me` para mostrar la academia del Profesor/Director y bloquear el
  alta cuando está `INACTIVE`.

Las altas en organizaciones inactivas se rechazan en la interfaz y, si la API
responde `409 ORGANIZATION_INACTIVE`, se muestra el mensaje del servidor. La
autorización real siempre la valida backend.
