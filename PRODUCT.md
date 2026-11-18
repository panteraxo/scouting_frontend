# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El usuario primario es el **ojeador independiente**: trabaja solo, sin pertenecer a un club, y su tarea es descubrir jugadores, dejar constancia de lo que observa y presentar candidatos a clubes.

Otras audiencias confirmadas por las reglas de negocio vigentes, en orden de relación con el trabajo del ojeador:

- **Profesor y Director de academia**: gestionan los perfiles de los jugadores de su propia academia y registran tutor y consentimiento cuando el jugador es menor.
- **Responsable de club**: recibe recomendaciones dirigidas a su club y responde si le interesa, si necesita más información o si no le interesa.
- **Administrador**: aprueba solicitudes de ojeador, verifica academias y clubes, gestiona cuentas y consulta metadatos de auditoría.
- **Jugador**: consulta únicamente su propio perfil; no ve prospecciones, evaluaciones ni recomendaciones.

## Product Purpose

Scouting.pe es un sistema web para la búsqueda, evaluación y seguimiento de jugadores de fútbol competitivo en Perú. Existe para que el trabajo de un ojeador deje de vivir en cuadernos, chats y videos sueltos, y pase a ser un registro consultable, fechado y defendible ante un club.

El éxito significa que un ojeador puede sostener un seguimiento en el tiempo, que su evaluación resiste la revisión de un tercero y que un club puede decidir con la información exacta que se le compartió, sin acceso al resto.

## Positioning

El mecanismo diferenciador es la **evidencia trazable e inmutable**: cada evaluación es un registro histórico que se agrega y nunca se sobrescribe, asociado a una evidencia concreta (video o enlace). Corregir una evaluación significa emitir una nueva, no editar la anterior.

Ese registro es la base de la recomendación: el ojeador comparte solo lo que selecciona, el club recibe una instantánea congelada y la autoría y la fecha quedan registradas. Un producto que permitiera editar o borrar evaluaciones no podría ofrecer la misma garantía.

## Operating Context

- El ojeador se registra públicamente y su cuenta queda **pendiente** hasta que un administrador la apruebe; el registro no inicia sesión.
- El ojeador opera sin club. Cuando se vincula a uno, la vinculación registra estado y tipo, y una declaración no equivale a verificación.
- Un jugador puede ser seguido por varios ojeadores; cada ojeador mantiene como máximo una prospección por jugador, con estados En seguimiento, Pausada y Cerrada.
- El seguimiento se documenta con evaluaciones numeradas y evidencia por enlace; los archivos privados se consultan con acceso autorizado.
- Las academias y clubes se registran con ubicación por catálogo UBIGEO de INEI. Un club debe estar activo y verificado para recibir recomendaciones.
- Las organizaciones nuevas quedan operativas y pendientes de verificación; solo el Administrador cambia ese estado.
- El uso previsto es desde navegador, en escritorio y móvil, por personas que trabajan en cancha y luego cargan la información.

## Capabilities and Constraints

Capacidades confirmadas:

- Autenticación por correo con sesión de servidor; contraseña temporal de un solo uso para cuentas internas.
- Un rol por cuenta y una organización por usuario (academia o club).
- Perfil deportivo del jugador con academia actual, ubicación de residencia, posición, pie dominante, talla y peso.
- Historial deportivo append-only con resultado explícito y correcciones auditadas.
- Prospección y evaluaciones privadas por ojeador.
- Recomendación a club verificado con carta, selección de contenido e instantánea congelada; bandeja y respuesta del club.
- Registro de medios con almacenamiento público (logos y fotos) y privado (videos).

Restricciones que el trabajo futuro debe preservar:

- Las notas privadas de prospección y evaluación solo las ve el ojeador autor. Ni el Administrador ni el club acceden a ellas.
- La autorización se valida en el servidor; ocultar una acción en la interfaz no protege el recurso.
- La identidad y el rol se leen de la sesión, nunca de un identificador enviado por el navegador.
- Los datos de tutor y consentimiento de un menor solo se exponen a los roles autorizados y dejan de exponerse al cumplir la mayoría de edad.
- Compartir información de un menor con un club exige consentimiento vigente del tutor.
- Una recomendación no se elimina y no altera lo que el club ya recibió.
- Un perfil incompleto no aparece al ojeador.
- No se tratan estadísticas desconocidas como cero.
- El alcance actual es Perú y fútbol competitivo; no hay integraciones de terceros en tiempo de ejecución salvo el almacenamiento de medios y el catálogo local de UBIGEO.

Decisiones abiertas, registradas para no inventarlas:

- Modelo de negocio, precios, planes y quién paga no están definidos.
- El proceso de retiro de un perfil deportivo no está definido.
- La carga de documentos binarios de autorización del tutor no está en el alcance actual.
- Los tipos de academia y club se capturan como texto libre en esta fase.

## Evidence on Hand

- Reglas de negocio y modelo de datos documentados en `docs/reglas-negocio.md`, `docs/modelo-datos.md` y `docs/arquitectura.md` (raíz del repositorio).
- Implementación funcional del frontend (Next.js, App Router) y del backend (Spring Boot) para los módulos descritos arriba.
- No existen testimonios, clientes, métricas de uso, casos de estudio ni cifras de rendimiento reales. El trabajo futuro no debe fabricarlos.

## Product Principles

1. **El ojeador es la unidad de confianza.** Su criterio se registra y se respeta; sus notas son privadas y su trabajo se audita por lo que compartió, no por lo que escribió.
2. **Ninguna evaluación se reescribe.** El historial es el argumento del producto: corregir es agregar, nunca borrar.
3. **Compartir es un acto explícito y acotado.** Solo viaja lo seleccionado, congelado al momento del envío y autorizado por quien corresponde.
4. **La autorización vive en el servidor.** La interfaz refleja permisos; no los concede.
5. **Los datos de menores tienen trato especial por defecto.** No es una configuración que alguien deba recordar activar.
