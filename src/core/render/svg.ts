/**
 * Utilidades de render SVG compartidas por organigramas y DFD.
 * Todo se genera como string: es isomorfo (navegador, Node, tests).
 */

export const FUENTE = 'Helvetica, Arial, sans-serif'

export interface OpcionesRender {
  /** Sin colores: negro sobre blanco, ideal para fotocopia o examen. */
  monocromo?: boolean
  /** Incluye una leyenda de tipos de línea al pie. */
  leyenda?: boolean
  /** Fuerza mostrar u ocultar los separadores de nivel. */
  mostrarNiveles?: boolean
}

/** Redondea a 1 decimal para SVG compacto. */
export function n(valor: number): string {
  return (Math.round(valor * 10) / 10).toString()
}

export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Quita puntos repetidos y colineales (evita "bultos" en tramos rectos). */
function simplificar(puntos: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const sinRepetidos: Array<{ x: number; y: number }> = []
  for (const p of puntos) {
    const ultimo = sinRepetidos[sinRepetidos.length - 1]
    if (ultimo && Math.abs(ultimo.x - p.x) < 0.01 && Math.abs(ultimo.y - p.y) < 0.01) continue
    sinRepetidos.push(p)
  }
  const resultado: Array<{ x: number; y: number }> = []
  for (let i = 0; i < sinRepetidos.length; i++) {
    if (i === 0 || i === sinRepetidos.length - 1) {
      resultado.push(sinRepetidos[i])
      continue
    }
    const a = resultado[resultado.length - 1]
    const b = sinRepetidos[i]
    const c = sinRepetidos[i + 1]
    const cruz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    if (Math.abs(cruz) < 0.5) continue
    resultado.push(b)
  }
  return resultado
}

/** Path de una polilínea con esquinas redondeadas. */
export function pathDesdePuntos(entrada: Array<{ x: number; y: number }>, redondeo = 8): string {
  const puntos = simplificar(entrada)
  if (puntos.length === 0) return ''
  if (puntos.length === 1) return `M ${n(puntos[0].x)} ${n(puntos[0].y)}`

  let d = `M ${n(puntos[0].x)} ${n(puntos[0].y)}`
  for (let i = 1; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1]
    const p1 = puntos[i]
    const p2 = puntos[i + 1]
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const r = Math.min(redondeo, d1 / 2, d2 / 2)
    if (r <= 0.5 || d1 === 0 || d2 === 0) {
      d += ` L ${n(p1.x)} ${n(p1.y)}`
      continue
    }
    const u1 = { x: (p0.x - p1.x) / d1, y: (p0.y - p1.y) / d1 }
    const u2 = { x: (p2.x - p1.x) / d2, y: (p2.y - p1.y) / d2 }
    const a = { x: p1.x + u1.x * r, y: p1.y + u1.y * r }
    const b = { x: p1.x + u2.x * r, y: p1.y + u2.y * r }
    d += ` L ${n(a.x)} ${n(a.y)} Q ${n(p1.x)} ${n(p1.y)} ${n(b.x)} ${n(b.y)}`
  }
  const ultimo = puntos[puntos.length - 1]
  d += ` L ${n(ultimo.x)} ${n(ultimo.y)}`
  return d
}

export interface OpcionesTexto {
  tamano?: number
  color?: string
  peso?: number | string
  interlineado?: number
  ancla?: 'start' | 'middle' | 'end'
  /** Atributos extra para el <text> (por ejemplo data-*). */
  extra?: string
}

/** Bloque de texto centrado verticalmente alrededor de `cy`. */
export function textoCentrado(cx: number, cy: number, lineas: string[], opciones: OpcionesTexto = {}): string {
  const tamano = opciones.tamano ?? 13
  const inter = tamano * (opciones.interlineado ?? 1.25)
  const inicio = cy - ((lineas.length - 1) * inter) / 2 + tamano * 0.34
  const ancla = opciones.ancla ?? 'middle'
  const color = opciones.color ?? '#111827'
  const peso = opciones.peso ? ` font-weight="${opciones.peso}"` : ''
  return lineas
    .filter((l) => l !== '')
    .map(
      (linea, i) =>
        `<text x="${n(cx)}" y="${n(inicio + i * inter)}" text-anchor="${ancla}" font-family="${FUENTE}" font-size="${tamano}" fill="${color}"${peso}${opciones.extra ? ` ${opciones.extra}` : ''}>${esc(linea)}</text>`,
    )
    .join('')
}

/** Definición del marcador de flecha para un color dado. */
export function defFlecha(id: string, color: string): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`
}

/** Documento SVG completo. */
export function documento(
  ancho: number,
  alto: number,
  defs: string,
  contenido: string,
  fondo = '#ffffff',
): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(ancho)}" height="${n(alto)}" viewBox="0 0 ${n(ancho)} ${n(alto)}">`,
    defs ? `<defs>${defs}</defs>` : '',
    `<rect x="0" y="0" width="${n(ancho)}" height="${n(alto)}" fill="${fondo}"/>`,
    contenido,
    '</svg>',
  ]
    .filter(Boolean)
    .join('\n')
}
