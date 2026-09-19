/**
 * Modo examen (graficador puro).
 *
 * En el build de producción —y también en desarrollo con
 * `VITE_SOLO_EDITOR=1 pnpm dev`— la app funciona solo como graficador: sin
 * galería, sin página de reglas y sin validador de la cátedra, para no tener
 * ayudas de más en un examen virtual. Quedan el editor YAML, la vista previa
 * y las exportaciones.
 */
export const SOLO_GRAFICADOR = import.meta.env.PROD || import.meta.env.VITE_SOLO_EDITOR === '1'
