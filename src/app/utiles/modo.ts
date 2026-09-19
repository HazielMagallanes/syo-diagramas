import type { Hallazgo } from '../../core/tipos'

/**
 * ¿Hay que bloquear la vista previa?
 *
 * En modo graficador (examen) nunca se bloquea por reglas de la cátedra: el
 * diagrama se dibuja tal cual, sin que la app actúe de corrector. Fuera de ese
 * modo, un error de reglas impide renderizar (para no dibujar algo inválido).
 */
export function debeBloquearRender(hallazgos: Hallazgo[], soloGraficador: boolean): boolean {
  if (soloGraficador) return false
  return hallazgos.some((h) => h.severidad === 'error')
}
