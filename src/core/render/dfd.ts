import { diagramarDfd } from '../layout/dfd'
import type { CajaNodoDfd } from '../layout/dfd'
import type { Dfd } from '../tipos'
import { defFlecha, documento, esc, n, pathDesdePuntos, textoCentrado, type OpcionesRender } from './svg'

const ALTO_TITULO = 46

const ETIQUETA_NIVEL: Record<number, string> = {
  0: 'Nivel 0 · Diagrama de contexto',
  1: 'Nivel 1 · Diagrama de nivel superior',
}

function subtituloNivel(nivel: number): string {
  return ETIQUETA_NIVEL[nivel] ?? `Nivel ${nivel} · Diagrama de detalle o expansión`
}

interface Bloque {
  lineas: string[]
  tamano: number
  peso?: number
}

function bloquesDe(caja: CajaNodoDfd): Bloque[] {
  const bloques: Bloque[] = []
  if (caja.nodo.numero) bloques.push({ lineas: [caja.nodo.numero], tamano: 12, peso: 600 })
  bloques.push({ lineas: caja.lineas, tamano: 13 })
  if (caja.lineasDetalle.length > 0) bloques.push({ lineas: caja.lineasDetalle, tamano: 11 })
  return bloques
}

/** Renderiza un DFD como SVG con los símbolos de la cátedra. */
export function renderizarDfd(
  dfd: Dfd,
  opciones: OpcionesRender = {},
): { svg: string; ancho: number; alto: number } {
  const diseno = diagramarDfd(dfd)
  const mono = opciones.monocromo ?? false

  const colorTexto = mono ? '#000000' : '#111827'
  const colorFlujo = mono ? '#000000' : '#374151'
  const colorProceso = mono ? '#000000' : '#1d4ed8'
  const colorProcesoFondo = mono ? '#ffffff' : '#eff6ff'
  const colorEntidad = mono ? '#000000' : '#111827'
  const colorAlmacen = mono ? '#000000' : '#92400e'
  const colorTitulo = mono ? '#000000' : '#374151'

  const idFlecha = `flecha-${colorFlujo.replace('#', '')}`
  const defs = defFlecha(idFlecha, colorFlujo)

  const anchoTotal = Math.max(diseno.ancho, 300)
  const altoTotal = diseno.alto + ALTO_TITULO + 12

  const partes: string[] = []
  const cabecera: string[] = []

  cabecera.push(
    `<text x="${n(anchoTotal / 2)}" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="${colorTexto}">${esc(dfd.titulo)}</text>`,
  )
  cabecera.push(
    `<text x="${n(anchoTotal / 2)}" y="40" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="${colorTitulo}">${esc(subtituloNivel(dfd.nivel))}</text>`,
  )

  // ── Flujos (debajo de los nodos) ─────────────────────────────────────────
  for (const arista of diseno.aristas) {
    const path = pathDesdePuntos(arista.puntos, 6)
    partes.push(
      `<path d="${path}" fill="none" stroke="${colorFlujo}" stroke-width="1.5" marker-end="url(#${idFlecha})"/>`,
    )
  }

  // ── Etiquetas de flujo (con fondo blanco para que no las cruce una línea) ─
  for (const arista of diseno.aristas) {
    if (!arista.etiqueta) continue
    const e = arista.etiqueta
    partes.push(
      `<rect x="${n(e.x - e.ancho / 2)}" y="${n(e.y - e.alto / 2)}" width="${n(e.ancho)}" height="${n(e.alto)}" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="none"/>`,
    )
    partes.push(textoCentrado(e.x, e.y, [e.texto], { tamano: 11, color: colorTexto }))
  }

  // ── Nodos ────────────────────────────────────────────────────────────────
  for (const caja of diseno.cajas) {
    const { nodo } = caja
    const x = caja.x - caja.ancho / 2
    const y = caja.y - caja.alto / 2

    if (nodo.tipo === 'proceso') {
      partes.push(
        `<ellipse cx="${n(caja.x)}" cy="${n(caja.y)}" rx="${n(caja.ancho / 2)}" ry="${n(caja.alto / 2)}" fill="${colorProcesoFondo}" stroke="${colorProceso}" stroke-width="1.6" data-nodo="${esc(caja.id)}"/>`,
      )
    } else if (nodo.tipo === 'entidad') {
      partes.push(
        `<rect x="${n(x)}" y="${n(y)}" width="${n(caja.ancho)}" height="${n(caja.alto)}" fill="#ffffff" stroke="${colorEntidad}" stroke-width="1.6" data-nodo="${esc(caja.id)}"/>`,
      )
    } else {
      // Almacén: dos líneas paralelas
      partes.push(
        `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + caja.ancho)}" y2="${n(y)}" stroke="${colorAlmacen}" stroke-width="1.6" data-nodo="${esc(caja.id)}"/>`,
      )
      partes.push(
        `<line x1="${n(x)}" y1="${n(y + caja.alto)}" x2="${n(x + caja.ancho)}" y2="${n(y + caja.alto)}" stroke="${colorAlmacen}" stroke-width="1.6"/>`,
      )
    }

    const bloques = bloquesDe(caja)
    const altos = bloques.map((b) => b.lineas.length * b.tamano * 1.3)
    const total = altos.reduce((a, b) => a + b, 0)
    let cursor = caja.y - total / 2
    bloques.forEach((bloque, i) => {
      partes.push(
        textoCentrado(caja.x, cursor + altos[i] / 2, bloque.lineas, {
          tamano: bloque.tamano,
          peso: bloque.peso,
          color: colorTexto,
        }),
      )
      cursor += altos[i]
    })
  }

  const contenido = `${cabecera.join('\n')}\n<g transform="translate(0, ${n(ALTO_TITULO)})">${partes.filter(Boolean).join('\n')}</g>`
  return { svg: documento(anchoTotal, altoTotal, defs, contenido), ancho: anchoTotal, alto: altoTotal }
}
