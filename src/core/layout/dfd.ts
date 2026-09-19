import dagre from '@dagrejs/dagre'
import { altoBloque, anchoTexto, envolver } from '../medir'
import type { Dfd, Flujo, NodoDfd } from '../tipos'

const TAMANO = 13
const TAMANO_DETALLE = 11

export interface CajaNodoDfd {
  id: string
  nodo: NodoDfd
  x: number
  y: number
  ancho: number
  alto: number
  /** Nombre envuelto en líneas. */
  lineas: string[]
  /** Detalle envuelto en líneas (puede estar vacío). */
  lineasDetalle: string[]
}

export interface EtiquetaFlujo {
  x: number
  y: number
  texto: string
  ancho: number
  alto: number
}

export interface AristaDfd {
  flujo: Flujo
  puntos: Array<{ x: number; y: number }>
  etiqueta?: EtiquetaFlujo
}

export interface DisenoDfd {
  ancho: number
  alto: number
  cajas: CajaNodoDfd[]
  aristas: AristaDfd[]
}

interface MedidaNodo {
  ancho: number
  alto: number
  lineas: string[]
  lineasDetalle: string[]
}

function medirNodo(nodo: NodoDfd): MedidaNodo {
  const lineasDetalle = nodo.detalle ? envolver(nodo.detalle, 190, TAMANO_DETALLE) : []
  let lineas: string[]
  let ancho: number
  let alto: number

  if (nodo.tipo === 'proceso') {
    lineas = envolver(nodo.nombre, 170, TAMANO)
    const anchoNombre = Math.max(...lineas.map((l) => anchoTexto(l, TAMANO)))
    const anchoNumero = nodo.numero ? anchoTexto(nodo.numero, TAMANO + 1) + 8 : 0
    ancho = Math.max(140, Math.ceil(Math.max(anchoNombre, anchoNumero)) + 68)
    const lineasTotales = lineas.length + (nodo.numero ? 1 : 0) + lineasDetalle.length
    alto = Math.ceil(altoBloque(lineasTotales, TAMANO)) + 30
  } else if (nodo.tipo === 'entidad') {
    lineas = envolver(nodo.nombre, 190, TAMANO)
    const anchoNombre = Math.max(...lineas.map((l) => anchoTexto(l, TAMANO)))
    const anchoDetalle = lineasDetalle.length
      ? Math.max(...lineasDetalle.map((l) => anchoTexto(l, TAMANO_DETALLE)))
      : 0
    ancho = Math.max(120, Math.ceil(Math.max(anchoNombre, anchoDetalle)) + 40)
    alto =
      Math.ceil(altoBloque(lineas.length, TAMANO) + altoBloque(lineasDetalle.length || 0.001, TAMANO_DETALLE, 1.4)) +
      22
  } else {
    lineas = envolver(nodo.nombre, 200, TAMANO)
    const anchoNombre = Math.max(...lineas.map((l) => anchoTexto(l, TAMANO)))
    const anchoDetalle = lineasDetalle.length
      ? Math.max(...lineasDetalle.map((l) => anchoTexto(l, TAMANO_DETALLE)))
      : 0
    ancho = Math.max(130, Math.ceil(Math.max(anchoNombre, anchoDetalle)) + 60)
    alto =
      Math.ceil(altoBloque(lineas.length, TAMANO) + altoBloque(lineasDetalle.length || 0.001, TAMANO_DETALLE, 1.4)) +
      26
  }

  return { ancho, alto, lineas, lineasDetalle }
}

/** Punto sobre la polilínea a mitad de recorrido (para ubicar la etiqueta). */
function puntoMedio(puntos: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (puntos.length === 0) return { x: 0, y: 0 }
  if (puntos.length === 1) return puntos[0]
  let total = 0
  const segmentos: number[] = []
  for (let i = 1; i < puntos.length; i++) {
    const d = Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y)
    segmentos.push(d)
    total += d
  }
  let objetivo = total / 2
  for (let i = 0; i < segmentos.length; i++) {
    if (objetivo <= segmentos[i]) {
      const t = segmentos[i] === 0 ? 0 : objetivo / segmentos[i]
      return {
        x: puntos[i].x + (puntos[i + 1].x - puntos[i].x) * t,
        y: puntos[i].y + (puntos[i + 1].y - puntos[i].y) * t,
      }
    }
    objetivo -= segmentos[i]
  }
  return puntos[puntos.length - 1]
}

/**
 * Layout de un DFD con dagre (flujo izquierda → derecha).
 * Respeta los símbolos por tipo de nodo y enruta los flujos con etiquetas.
 */
export function diagramarDfd(dfd: Dfd): DisenoDfd {
  const medidas = new Map(dfd.nodos.map((n) => [n.id, medirNodo(n)]))

  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({
    rankdir: 'LR',
    nodesep: 46,
    ranksep: 92,
    edgesep: 18,
    marginx: 24,
    marginy: 24,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of dfd.nodos) {
    const m = medidas.get(n.id) as MedidaNodo
    g.setNode(n.id, { width: m.ancho, height: m.alto })
  }

  dfd.flujos.forEach((f, idx) => {
    if (!medidas.has(f.de) || !medidas.has(f.a)) return
    const etiqueta = f.etiqueta?.trim()
    g.setEdge(
      f.de,
      f.a,
      {
        width: etiqueta ? Math.ceil(anchoTexto(etiqueta, TAMANO_DETALLE)) + 12 : 1,
        height: etiqueta ? 18 : 1,
      },
      `e${idx}`,
    )
  })

  dagre.layout(g)

  const cajas: CajaNodoDfd[] = dfd.nodos.map((n) => {
    const m = medidas.get(n.id) as MedidaNodo
    const pos = g.node(n.id) as { x: number; y: number }
    return {
      id: n.id,
      nodo: n,
      x: pos.x,
      y: pos.y,
      ancho: m.ancho,
      alto: m.alto,
      lineas: m.lineas,
      lineasDetalle: m.lineasDetalle,
    }
  })

  const aristas: AristaDfd[] = []
  dfd.flujos.forEach((f, idx) => {
    if (!medidas.has(f.de) || !medidas.has(f.a)) return
    const borde = g.edge({ v: f.de, w: f.a, name: `e${idx}` }) as
      | { points?: Array<{ x: number; y: number }> }
      | undefined
    const puntos = borde?.points ?? []
    if (puntos.length === 0) return
    const etiquetaTexto = f.etiqueta?.trim()
    let etiqueta: EtiquetaFlujo | undefined
    if (etiquetaTexto) {
      const medio = puntoMedio(puntos)
      etiqueta = {
        x: medio.x,
        y: medio.y,
        texto: etiquetaTexto,
        ancho: Math.ceil(anchoTexto(etiquetaTexto, TAMANO_DETALLE)) + 10,
        alto: 16,
      }
    }
    aristas.push({ flujo: f, puntos: puntos.map((p) => ({ x: p.x, y: p.y })), etiqueta })
  })

  const grafo = g.graph() as { width?: number; height?: number }
  return {
    ancho: grafo.width ?? 100,
    alto: grafo.height ?? 100,
    cajas,
    aristas,
  }
}
