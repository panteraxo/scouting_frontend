/** Rutas de interfaz del módulo Prospecciones. */
export const PROSPECTS_PATH = "/prospecciones";
export const PROSPECT_CREATE_PATH = `${PROSPECTS_PATH}/nueva`;

export function prospectDetailPath(id: number): string {
  return `${PROSPECTS_PATH}/${id}`;
}

export function prospectCreatePath(playerId: number): string {
  return `${PROSPECT_CREATE_PATH}?playerId=${playerId}`;
}

export function prospectEvaluationCreatePath(prospectId: number): string {
  return `${PROSPECTS_PATH}/${prospectId}/evaluaciones/nueva`;
}

/** API del módulo. */
export const PROSPECTS_API = "/prospects";
