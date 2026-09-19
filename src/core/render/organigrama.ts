import { diagramarOrganigrama } from '../layout/organigrama'
import type { CeldaRadial } from '../layout/organigrama'
import type { Organigrama } from '../tipos'
import {
  FUENTE,
  defFlecha,
  documento,
  esc,
  n,
  pathDesdePuntos,
  textoCentrado,
  type OpcionesRender,
} from './svg'

const ALTO_TITULO = 40
const ALTO_LEYENDA = 30

/** Punto sobre una circunferencia. */
function puntoSVG(cx: number, cy: number, r: number, t: number): string {
  return `${n(cx + r * Math.cos(t))} ${n(cy + r * Math.sin(t))}`
}

/** Sector de corona (anillo) entre r0 y r1 y los ángulos t0 y t1. */
function rutaSector(cx: number, cy: number, r0: number, r1: number, t0: number, t1: number): string {
  const grande = t1 - t0 > Math.PI ? 1 : 0
  return [
    `M ${puntoSVG(cx, cy, r0, t0)}`,
    `L ${puntoSVG(cx, cy, r1, t0)}`,
    `A ${n(r1)} ${n(r1)} 0 ${grande} 1 ${puntoSVG(cx, cy, r1, t1)}`,
    `L ${puntoSVG(cx, cy, r0, t1)}`,
    `A ${n(r0)} ${n(r0)} 0 ${grande} 0 ${puntoSVG(cx, cy, r0, t0)}`,
    'Z',
  ].join(' ')
}

function celdaSVG(
  celda: CeldaRadial,
  centro: { x: number; y: number },
  colores: { borde: string; raizFondo: string },
): string {
  const comun = `fill="${celda.profundidad === 0 ? colores.raizFondo : '#ffffff'}" stroke="${colores.borde}" stroke-width="1.4" data-nodo="${esc(celda.id)}"`
  const guion = celda.staff ? ' stroke-dasharray="6 4"' : ''
  const vueltaCompleta = celda.theta1 - celda.theta0 >= Math.PI * 2 - 0.001

  if (celda.profundidad === 0 && vueltaCompleta) {
    return `<circle cx="${n(centro.x)}" cy="${n(centro.y)}" r="${n(celda.r1)}" ${comun}${guion}/>`
  }
  if (vueltaCompleta) {
    // Anillo completo (una sola rama): dos círculos en un path con evenodd.
    const circulo = (r: number): string =>
      `M ${n(centro.x - r)} ${n(centro.y)} A ${n(r)} ${n(r)} 0 1 0 ${n(centro.x + r)} ${n(centro.y)} A ${n(r)} ${n(r)} 0 1 0 ${n(centro.x - r)} ${n(centro.y)}`
    return `<path d="${circulo(celda.r1)} ${circulo(celda.r0)}" fill-rule="evenodd" ${comun}${guion}/>`
  }
  return `<path d="${rutaSector(centro.x, centro.y, celda.r0, celda.r1, celda.theta0, celda.theta1)}" ${comun}${guion}/>`
}

function etiquetaSVG(
  celda: CeldaRadial,
  centro: { x: number; y: number },
  color: string,
): string {
  const e = celda.etiqueta
  if (e.modo === 'horizontal') {
    return textoCentrado(e.x, e.y, e.lineas, {
      tamano: e.tamano,
      color,
      interlineado: 1.2,
      extra: `data-nodo-texto="${esc(celda.id)}"`,
    })
  }
  const inicio = -((e.lineas.length - 1) * e.altoLinea) / 2
  const textos = e.lineas
    .map(
      (linea, i) =>
        `<text x="${n(e.x)}" y="${n(inicio + i * e.altoLinea + e.tamano * 0.34)}" text-anchor="${e.ancla}" font-family="${FUENTE}" font-size="${e.tamano}" fill="${color}" data-nodo-texto="${esc(celda.id)}">${esc(linea)}</text>`,
    )
    .join('\n')
  return `<g transform="translate(${n(centro.x)}, ${n(centro.y)}) rotate(${n(e.rotacion)})">${textos}</g>`
}

/**
 * Renderiza un organigrama como SVG (string) respetando los símbolos de la
 * cátedra: entegrama rectangular, línea llena de autoridad, punteada de
 * dependencia funcional y línea de staff al costado. En circular/semicircular
 * dibuja celdas concéntricas (sunburst) como en las diapositivas.
 */
export function renderizarOrganigrama(
  organigrama: Organigrama,
  opciones: OpcionesRender = {},
): { svg: string; ancho: number; alto: number } {
  const diseno = diagramarOrganigrama(organigrama)
  const mono = opciones.monocromo ?? false
  const esRadial = Boolean(diseno.celdas && diseno.centro)

  const colorLinea = mono ? '#000000' : '#374151'
  const colorBorde = mono ? '#000000' : '#1f2937'
  const colorTexto = mono ? '#000000' : '#111827'
  const colorStaffFondo = mono ? '#ffffff' : '#f9fafb'
  const colorNivel = mono ? '#000000' : '#9ca3af'
  const colorRaizFondo = mono ? '#ffffff' : '#f1f5f9'

  const hayStaff =
    diseno.lineas.some((l) => l.tipo === 'staff') || (diseno.celdas?.some((c) => c.staff) ?? false)
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
    `<text x="${n(anchoTotal / 2)}" y="26" text-anchor="middle" font-family="${FUENTE}" font-size="16" font-weight="600" fill="${colorTexto}">${esc(organigrama.titulo)}</text>`,
  )

  if (esRadial) {
    const centro = diseno.centro as { x: number; y: number }
    const celdas = diseno.celdas as CeldaRadial[]

    // 1) Celdas (sectores concéntricos)
    for (const celda of celdas) {
      partes.push(celdaSVG(celda, centro, { borde: colorBorde, raizFondo: colorRaizFondo }))
    }
    // 2) Cordones de dependencia funcional, por encima y tenues
    for (const linea of diseno.lineas) {
      if (linea.tipo !== 'funcional' || linea.puntos.length < 2) continue
      partes.push(
        `<path d="${pathDesdePuntos(linea.puntos, 0)}" fill="none" stroke="${colorLinea}" stroke-width="1.3" stroke-dasharray="4 4" opacity="0.55" marker-end="url(#${idFlecha})"/>`,
      )
    }
    // 3) Etiquetas (arriba de todo)
    for (const celda of celdas) {
      partes.push(etiquetaSVG(celda, centro, colorTexto))
    }
  } else {
    // Niveles (franjas)
    if (mostrarNiveles) {
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
        partes.push(
          `<path d="${path}" fill="none" stroke="${colorLinea}" stroke-width="1.4" stroke-dasharray="7 5"/>`,
        )
      }
    }

    // Cajas
    for (const caja of diseno.cajas) {
      const x = caja.x - caja.ancho / 2
      const y = caja.y - caja.alto / 2
      partes.push(
        `<rect x="${n(x)}" y="${n(y)}" width="${n(caja.ancho)}" height="${n(caja.alto)}" rx="3" fill="${caja.staff ? colorStaffFondo : '#ffffff'}" stroke="${colorBorde}" stroke-width="1.4" data-nodo="${esc(caja.id)}"/>`,
      )
      partes.push(
        textoCentrado(caja.x, caja.y, caja.lineas, {
          tamano: 13,
          color: colorTexto,
          extra: `data-nodo-texto="${esc(caja.id)}"`,
        }),
      )
    }
  }

  // Leyenda
  if (mostrarLeyenda) {
    const y = altoTotal - 14
    let x = 20
    const items: Array<{ tipo: 'autoridad' | 'funcional' | 'staff'; etiqueta: string }> = []
    if (!esRadial) items.push({ tipo: 'autoridad', etiqueta: 'Autoridad' })
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
        `<text x="${n(x + 32)}" y="${n(y)}" font-family="${FUENTE}" font-size="11" fill="${colorTexto}">${esc(item.etiqueta)}</text>`,
      )
      x += 42 + item.etiqueta.length * 6.2 + 18
    }
  }

  const contenido = `${cabecera.join('\n')}\n<g transform="translate(0, ${n(desplazamientoY)})">${partes.filter(Boolean).join('\n')}</g>`
  return { svg: documento(anchoTotal, altoTotal, defs, contenido), ancho: anchoTotal, alto: altoTotal }
}
