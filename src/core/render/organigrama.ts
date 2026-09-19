import { diagramarOrganigrama } from '../layout/organigrama'
import type { Organigrama } from '../tipos'
import { defFlecha, documento, esc, n, pathDesdePuntos, textoCentrado, type OpcionesRender } from './svg'

const ALTO_TITULO = 40
const ALTO_LEYENDA = 30

/**
 * Renderiza un organigrama como SVG (string) respetando los símbolos de la
 * cátedra: entegrama rectangular, línea llena de autoridad, punteada de
 * dependencia funcional y línea de staff al costado.
 */
export function renderizarOrganigrama(
  organigrama: Organigrama,
  opciones: OpcionesRender = {},
): { svg: string; ancho: number; alto: number } {
  const diseno = diagramarOrganigrama(organigrama)
  const mono = opciones.monocromo ?? false

  const colorLinea = mono ? '#000000' : '#374151'
  const colorBorde = mono ? '#000000' : '#1f2937'
  const colorTexto = mono ? '#000000' : '#111827'
  const colorStaffFondo = mono ? '#ffffff' : '#f9fafb'
  const colorNivel = mono ? '#000000' : '#9ca3af'

  const hayStaff = diseno.lineas.some((l) => l.tipo === 'staff')
  const hayFuncional = diseno.lineas.some((l) => l.tipo === 'funcional')
  const mostrarLeyenda = (opciones.leyenda ?? false) && (hayStaff || hayFuncional)
  const mostrarNiveles = opciones.mostrarNiveles ?? organigrama.mostrarNiveles ?? false

  const idFlecha = `flecha-${colorLinea.replace('#', '')}`
  const defs = defFlecha(idFlecha, colorLinea)

  const desplazamientoY = ALTO_TITULO + (mostrarLeyenda ? ALTO_LEYENDA : 0)
  const anchoTotal = Math.max(diseno.ancho, 260)
  const altoTotal = diseno.alto + desplazamientoY + 16

  const partes: string[] = []
  const cabecera: string[] = []

  // Título
  cabecera.push(
    `<text x="${n(anchoTotal / 2)}" y="26" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="${colorTexto}">${esc(organigrama.titulo)}</text>`,
  )

  // Niveles (franjas)
  if (mostrarNiveles && diseno.separadores.length > 0) {
    for (const sep of diseno.separadores) {
      const horizontal = organigrama.disposicion === 'horizontal'
      const linea = horizontal
        ? `<line x1="${n(sep.posicion)}" y1="0" x2="${n(sep.posicion)}" y2="${n(diseno.alto)}" stroke="${colorNivel}" stroke-width="1" stroke-dasharray="6 6"/>`
        : `<line x1="0" y1="${n(sep.posicion)}" x2="${n(anchoTotal)}" y2="${n(sep.posicion)}" stroke="${colorNivel}" stroke-width="1" stroke-dasharray="6 6"/>`
      partes.push(linea)
      partes.push(
        textoCentrado(
          horizontal ? sep.posicion - 10 : 26,
          horizontal ? 16 : sep.posicion - 14,
          [`Nivel ${sep.profundidad + 1}`],
          { tamano: 10, color: colorNivel, ancla: horizontal ? 'middle' : 'start' },
        ),
      )
    }
  }

  // Líneas
  for (const linea of diseno.lineas) {
    const puntos = linea.puntos
    if (puntos.length < 2) continue
    const path = pathDesdePuntos(puntos, 10)
    if (linea.tipo === 'autoridad') {
      partes.push(
        `<path d="${path}" fill="none" stroke="${colorLinea}" stroke-width="1.6" marker-end="url(#${idFlecha})"/>`,
      )
    } else if (linea.tipo === 'funcional') {
      partes.push(
        `<path d="${path}" fill="none" stroke="${colorLinea}" stroke-width="1.4" stroke-dasharray="2 3" marker-end="url(#${idFlecha})"/>`,
      )
    } else {
      partes.push(`<path d="${path}" fill="none" stroke="${colorLinea}" stroke-width="1.4" stroke-dasharray="7 5"/>`)
    }
  }

  // Cajas
  for (const caja of diseno.cajas) {
    const x = caja.x - caja.ancho / 2
    const y = caja.y - caja.alto / 2
    partes.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(caja.ancho)}" height="${n(caja.alto)}" rx="3" fill="${caja.staff ? colorStaffFondo : '#ffffff'}" stroke="${colorBorde}" stroke-width="1.4" data-nodo="${esc(caja.id)}"/>`,
    )
    partes.push(textoCentrado(caja.x, caja.y, caja.lineas, { tamano: 13, color: colorTexto, extra: `data-nodo-texto="${esc(caja.id)}"` }))
  }

  // Leyenda
  if (mostrarLeyenda) {
    const y = altoTotal - 14
    let x = 20
    const items: Array<{ tipo: 'autoridad' | 'funcional' | 'staff'; etiqueta: string }> = []
    items.push({ tipo: 'autoridad', etiqueta: 'Autoridad' })
    if (hayFuncional) items.push({ tipo: 'funcional', etiqueta: 'Dependencia funcional' })
    if (hayStaff) items.push({ tipo: 'staff', etiqueta: 'Asesoramiento (staff)' })
    for (const item of items) {
      const guion =
        item.tipo === 'staff'
          ? `<line x1="${n(x)}" y1="${n(y - 4)}" x2="${n(x + 26)}" y2="${n(y - 4)}" stroke="${colorLinea}" stroke-width="1.4" stroke-dasharray="7 5"/>`
          : item.tipo === 'funcional'
            ? `<line x1="${n(x)}" y1="${n(y - 4)}" x2="${n(x + 26)}" y2="${n(y - 4)}" stroke="${colorLinea}" stroke-width="1.4" stroke-dasharray="2 3"/>`
            : `<line x1="${n(x)}" y1="${n(y - 4)}" x2="${n(x + 26)}" y2="${n(y - 4)}" stroke="${colorLinea}" stroke-width="1.6"/>`
      partes.push(guion)
      partes.push(
        `<text x="${n(x + 32)}" y="${n(y)}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="${colorTexto}">${esc(item.etiqueta)}</text>`,
      )
      x += 42 + item.etiqueta.length * 6.2 + 18
    }
  }

  const contenido = `${cabecera.join('\n')}\n<g transform="translate(0, ${n(desplazamientoY)})">${partes.filter(Boolean).join('\n')}</g>`
  return { svg: documento(anchoTotal, altoTotal, defs, contenido), ancho: anchoTotal, alto: altoTotal }
}
