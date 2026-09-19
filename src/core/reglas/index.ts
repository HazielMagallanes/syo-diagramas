import type { Diagrama, Hallazgo, Severidad } from '../tipos'
import { validarDfd } from './dfd'
import { validarOrganigrama } from './organigrama'

export { REGLAS, reglaPorId } from './catalogo'

/** Aplica las reglas de la cátedra según el tipo de diagrama. */
export function validar(diagrama: Diagrama): Hallazgo[] {
  return diagrama.tipo === 'organigrama' ? validarOrganigrama(diagrama) : validarDfd(diagrama)
}

export function hayErrores(hallazgos: Hallazgo[]): boolean {
  return hallazgos.some((h) => h.severidad === 'error')
}

export function contarPorSeveridad(hallazgos: Hallazgo[]): Record<Severidad, number> {
  return {
    error: hallazgos.filter((h) => h.severidad === 'error').length,
    advertencia: hallazgos.filter((h) => h.severidad === 'advertencia').length,
    info: hallazgos.filter((h) => h.severidad === 'info').length,
  }
}
