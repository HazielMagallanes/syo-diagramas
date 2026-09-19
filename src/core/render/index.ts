import type { Diagrama } from '../tipos'
import { renderizarDfd } from './dfd'
import { renderizarOrganigrama } from './organigrama'
import type { OpcionesRender } from './svg'

export type { OpcionesRender } from './svg'
export { renderizarOrganigrama } from './organigrama'
export { renderizarDfd } from './dfd'

export interface ResultadoRender {
  svg: string
  ancho: number
  alto: number
}

/** Renderiza cualquier diagrama a SVG. */
export function renderizar(diagrama: Diagrama, opciones: OpcionesRender = {}): ResultadoRender {
  return diagrama.tipo === 'organigrama'
    ? renderizarOrganigrama(diagrama, opciones)
    : renderizarDfd(diagrama, opciones)
}
