# Medios en R2 — contrato consumido por el frontend

Estado: **frontend y backend implementados; pendiente prueba end-to-end con CORS/R2 de producción**.
Este archivo documenta el contrato usado y los supuestos que deben confirmarse.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/media/uploads` | Solicita URL presignada. Requiere CSRF. |
| `PUT` | `uploadUrl` devuelta | Subida binaria directa a R2. Sin CSRF ni cookies. |
| `POST` | `/media/{mediaId}/complete` | Confirma el objeto. Requiere CSRF. |
| `GET` | `/media/{mediaId}/play` | Reproducción autenticada del video privado. |

`POST /media/uploads` recibe `{ kind, purpose, contentType, sizeBytes }` y
responde `{ mediaId, uploadUrl, method, headers, publicUrl, playbackPath }`.
`POST /media/{mediaId}/complete` responde
`{ mediaId, kind, publicUrl, playbackPath, contentType, sizeBytes }`.

## Supuestos acordados con el frontend

- `purpose` es texto libre desde el punto de vista del frontend. Valores usados:
  - `PLAYER_PHOTO` (foto de jugador)
  - `ORGANIZATION_LOGO` (logo de academia o club)
  - `PLAYER_HISTORY_VIDEO` (video de una entrada de historial)
  - `PROSPECT_EVALUATION_VIDEO` (video de una evaluación de prospección)
- `mediaId` es un UUID de 36 caracteres (el frontend también acepta número por compatibilidad).
- `headers` devueltos por el presignado deben enviarse sin modificar en el `PUT`.
  El frontend no agrega CSRF ni cookies a esa petición.
- `complete` se llama **solo** después de que el `PUT` responda 2xx. Si el `PUT`
  falla, el usuario puede reintentar; no se crea una confirmación parcial.
- Para imágenes se guarda `publicUrl` del `complete` en `photoUrl` / `logoUrl`.
- Para videos se guarda `${NEXT_PUBLIC_API_BASE_URL}/media/{mediaId}/play` en
  `videoUrl`. `playbackPath` se conserva por si el backend cambia de forma.
- No hay transcodificación, HLS ni transcripción en esta tarea.

## Límites aplicados en el navegador

- Imagen: JPEG/PNG/WebP, máximo 5 MB. Se redimensiona a 1600 px de ancho
  conservando proporción y se comprime a JPEG antes de subir.
- Video: MP4/WebM, máximo 200 MB. Se sube sin modificar; el navegador debe poder
  reproducirlo.

## Riesgos y pendientes

- Los archivos se suben al elegir el archivo, no al guardar el formulario. Si el
  usuario abandona la pantalla, el objeto queda huérfano en R2. Se requiere una
  política de limpieza de medios `PENDING`.
- La reproducción usa el elemento `<video>` contra `/media/{id}/play`. Para que la
  cookie de sesión viaje en un origen distinto, el backend debe configurar
  `SameSite=None; Secure` (o servir frontend y API en el mismo sitio).
- No se implementan múltiples videos por entrada de historial (SCP-021).
- No hay cancelación ni reintento automático; el reintento es manual.
