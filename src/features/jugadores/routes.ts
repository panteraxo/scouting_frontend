/** Rutas de interfaz del módulo Jugadores. */
export const PLAYERS_PATH = "/jugadores";
export const PLAYER_CREATE_PATH = `${PLAYERS_PATH}/nuevo`;
export const MY_PROFILE_PATH = "/mi-perfil";

export function playerDetailPath(id: number): string {
  return `${PLAYERS_PATH}/${id}`;
}

export function playerEditPath(id: number): string {
  return `${PLAYERS_PATH}/${id}/editar`;
}

export function playerGuardianPath(id: number): string {
  return `${PLAYERS_PATH}/${id}/tutor`;
}

export function playerHistoryCreatePath(id: number): string {
  return `${PLAYERS_PATH}/${id}/historial/nuevo`;
}

export function playerHistoryEditPath(
  id: number,
  historyId: number,
): string {
  return `${PLAYERS_PATH}/${id}/historial/${historyId}/editar`;
}

/** API del módulo. */
export const PLAYERS_API = "/players";
export const PLAYER_ACCOUNT_CANDIDATES_API = "/players/account-candidates";
export const MY_PLAYER_API = "/players/me";
