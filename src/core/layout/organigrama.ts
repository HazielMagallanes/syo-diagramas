import { flextree } from 'd3-flextree'
import { altoBloque, anchoTexto, envolver } from '../medir'
import type { Organigrama, Unidad } from '../tipos'

const TAMANO = 13
const PAD_X = 12
const PAD_Y = 8
const MIN_ANCHO = 116
const ANCHO_TEXTO_MAX = 150
const ANCHO_TEXTO_STAFF = 132
const HUECO_HERMANOS = 26
const HUECO_NIVEL = 58
const HUECO_RADIAL = 70
const MARGEN = 24

export type TipoLinea = 'autoridad' | 'funcional' | 'staff'

export interface CajaUnidad {
  id: string
  unidad: Unidad
  x: number
  y: number
  ancho: number
  alto: number
  lineas: string[]
  profundidad: number
  staff: boolean
}

export interface LineaOrganigrama {
  tipo: TipoLinea
  de: string
  a: string
  puntos: Array<{ x: number; y: number }>
}

export interface DisenoOrganigrama {
  ancho: number
  alto: number
  cajas: CajaUnidad[]
  lineas: LineaOrganigrama[]
  /** Posiciones (y en vertical, x en horizontal) de los separadores entre niveles. */
  separadores: Array<{ posicion: number; profundidad: number }>
}

interface NodoDatos {
  unidad: Unidad
  lineas: string[]
  ancho: number
  alto: number
  staff: boolean
  /** Posición entre los asesores del mismo lado de un mismo entegrama. */
  staffIndice?: number
  profundidad: number
  padreId?: string
  hijos: NodoDatos[]
}

function medirUnidad(u: Unidad, staff: boolean): { lineas: string[]; ancho: number; alto: number } {
  const lineas = envolver(u.nombre, staff ? ANCHO_TEXTO_STAFF : ANCHO_TEXTO_MAX, TAMANO)
  const anchoTextoMax = Math.max(...lineas.map((l) => anchoTexto(l, TAMANO)))
  const ancho = Math.max(MIN_ANCHO, Math.ceil(anchoTextoMax) + 2 * PAD_X)
  const alto = Math.ceil(altoBloque(lineas.length, TAMANO)) + 2 * PAD_Y
  return { lineas, ancho, alto }
}

function ordenarHermanos(unidades: Unidad[], indice: Map<string, number>): Unidad[] {
  return [...unidades].sort((a, b) => {
    const oa = a.orden ?? Number.MAX_SAFE_INTEGER
    const ob = b.orden ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return (indice.get(a.id) ?? 0) - (indice.get(b.id) ?? 0)
  })
}

function construirArbol(o: Organigrama): NodoDatos | null {
  const indice = new Map(o.unidades.map((u, i) => [u.id, i]))
  const raizUnidad = o.unidades.find((u) => (u.vinculo ?? 'autoridad') !== 'staff' && !u.padre)
  if (!raizUnidad) return null

  const visitados = new Set<string>()

  const crear = (u: Unidad, profundidad: number, padreId?: string): NodoDatos => {
    visitados.add(u.id)
    const med = medirUnidad(u, false)
    const nodo: NodoDatos = {
      unidad: u,
      ...med,
      staff: false,
      profundidad,
      padreId,
      hijos: [],
    }

    const autoridades = ordenarHermanos(
      o.unidades.filter(
        (h) => (h.vinculo ?? 'autoridad') !== 'staff' && h.padre === u.id && !visitados.has(h.id),
      ),
      indice,
    )
    const staff = ordenarHermanos(
      o.unidades.filter((s) => s.vinculo === 'staff' && s.asesoraA === u.id && !visitados.has(s.id)),
      indice,
    )
    // `lado: izq` pone el asesor a la izquierda del entegrama (antes en el orden).
    const staffIzq = ordenarHermanos(staff.filter((s) => s.lado === 'izq'), indice)
    const staffDer = ordenarHermanos(staff.filter((s) => s.lado !== 'izq'), indice)

    const staffNodos = (lista: Unidad[]): NodoDatos[] =>
      lista.map((s, i) => {
        visitados.add(s.id)
        const m = medirUnidad(s, true)
        return {
          unidad: s,
          ...m,
          staff: true,
          staffIndice: i,
          profundidad: profundidad + 1,
          padreId: u.id,
          hijos: [],
        }
      })

    const autoridadNodos = autoridades.map((h) => crear(h, profundidad + 1, u.id))
    nodo.hijos = [...staffNodos(staffIzq), ...autoridadNodos, ...staffNodos(staffDer)]
    return nodo
  }

  return crear(raizUnidad, 0)
}

function bordeHacia(
  caja: { x: number; y: number; ancho: number; alto: number },
  haciaX: number,
  haciaY: number,
): { x: number; y: number } {
  const dx = haciaX - caja.x
  const dy = haciaY - caja.y
  if (dx === 0 && dy === 0) return { x: caja.x, y: caja.y }
  const escalaX = dx !== 0 ? caja.ancho / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY
  const escalaY = dy !== 0 ? caja.alto / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY
  const t = Math.min(escalaX, escalaY)
  return { x: caja.x + dx * t, y: caja.y + dy * t }
}

/**
 * Calcula el layout de un organigrama en cualquiera de las 4 disposiciones.
 * Garantiza las reglas de la cátedra: mismo nivel → misma altura (o mismo
 * radio), una sola forma de graficar, staff al costado sin línea de autoridad.
 */
export function diagramarOrganigrama(o: Organigrama): DisenoOrganigrama {
  const raiz = construirArbol(o)
  if (!raiz) {
    return { ancho: MARGEN * 2, alto: MARGEN * 2, cajas: [], lineas: [], separadores: [] }
  }

  const radial = o.disposicion === 'circular' || o.disposicion === 'semicircular'
  const horizontal = o.disposicion === 'horizontal'

  const layout = flextree<NodoDatos>({
    // En vertical el eje "ancho" es el horizontal (ancho de caja); en
    // horizontal es el vertical (alto de caja). Los asesores reciben un
    // extra de espacio para que no se peguen a sus vecinos.
    nodeSize: (n) => [
      (horizontal ? n.data.alto : n.data.ancho) + (n.data.staff ? 96 : 0),
      1,
    ],
    spacing: HUECO_HERMANOS,
  })
  const arbol = layout.hierarchy(raiz, (d) => d.hijos)
  layout(arbol)

  const nodos: NodoDatos[] = []
  const posiciones = new Map<string, number>()
  arbol.each((n) => {
    nodos.push(n.data)
    // x de flextree = posición sobre el eje "ancho" (horizontal en vertical,
    // vertical en horizontal).
    posiciones.set(n.data.unidad.id, n.x)
  })

  // ── Tamaño de cada nivel ────────────────────────────────────────────────
  const maxProfundidad = nodos.reduce((m, n) => Math.max(m, n.profundidad), 0)
  const altoNivel = new Array<number>(maxProfundidad + 1).fill(0)
  const anchoNivel = new Array<number>(maxProfundidad + 1).fill(0)
  for (const n of nodos) {
    if (n.staff) continue
    altoNivel[n.profundidad] = Math.max(altoNivel[n.profundidad], n.alto)
    anchoNivel[n.profundidad] = Math.max(anchoNivel[n.profundidad], n.ancho)
  }

  const centroNivel = new Array<number>(maxProfundidad + 1).fill(0)
  let acumulado = MARGEN
  for (let d = 0; d <= maxProfundidad; d++) {
    const tamano = radial
      ? d === 0
        ? 0
        : Math.max(altoNivel[d - 1], altoNivel[d]) / 2 + HUECO_RADIAL
      : (horizontal ? anchoNivel[d] : altoNivel[d]) / 2
    acumulado += tamano
    centroNivel[d] = acumulado
    acumulado += radial ? 0 : (horizontal ? anchoNivel[d] : altoNivel[d]) / 2 + HUECO_NIVEL
  }

  // ── Radios para disposiciones radiales ──────────────────────────────────
  // El radio de cada anillo se calcula por demanda angular (que las cajas
  // entren a lo largo de la circunferencia) y por separación entre niveles.
  const anclas = new Map<string, NodoDatos>()
  for (const n of nodos) anclas.set(n.unidad.id, n)

  const radioNivel = new Array<number>(maxProfundidad + 1).fill(0)
  if (radial) {
    const span = o.disposicion === 'circular' ? Math.PI * 2 : Math.PI
    const demanda = new Array<number>(maxProfundidad + 1).fill(0)
    const anchoNivel = new Array<number>(maxProfundidad + 1).fill(0)
    for (const n of nodos) {
      const d = n.staff ? (anclas.get(n.padreId ?? '')?.profundidad ?? 0) : n.profundidad
      const dd = Math.max(0, Math.min(d, maxProfundidad))
      demanda[dd] += n.ancho + 28
      anchoNivel[dd] = Math.max(anchoNivel[dd], n.ancho)
    }
    for (let d = 0; d <= maxProfundidad; d++) {
      if (d === 0) {
        radioNivel[0] = 0
        continue
      }
      const porDemanda = (demanda[d] / span) * 1.15
      // En los laterales del círculo la separación entre anillos es
      // horizontal: hay que dejar lugar al ancho de las cajas.
      const porSeparacion =
        radioNivel[d - 1] + 0.55 * (anchoNivel[d - 1] + anchoNivel[d]) + 30
      radioNivel[d] = Math.max(porDemanda, porSeparacion)
    }
  }

  // ── Posiciones ──────────────────────────────────────────────────────────
  const cajas: CajaUnidad[] = []

  const xBruto = nodos.map((n) => posiciones.get(n.unidad.id) ?? 0)
  const minBruto = Math.min(...xBruto)
  const maxBruto = Math.max(...xBruto)
  const rango = maxBruto - minBruto || 1

  for (const n of nodos) {
    const bruto = posiciones.get(n.unidad.id) ?? 0
    const profundidad = n.staff ? (anclas.get(n.padreId ?? '')?.profundidad ?? n.profundidad - 1) : n.profundidad
    let x = 0
    let y = 0
    if (o.disposicion === 'vertical') {
      x = bruto
      const anclaNodo = n.staff ? anclas.get(n.padreId ?? '') : undefined
      const baseY = anclaNodo ? centroNivel[anclaNodo.profundidad] : centroNivel[profundidad]
      // Los asesores del mismo lado se escalonan hacia arriba para que sus
      // líneas no crucen las cajas de los otros.
      y = n.staff ? baseY - (n.staffIndice ?? 0) * (n.alto + 12) : centroNivel[profundidad]
    } else if (o.disposicion === 'horizontal') {
      x = centroNivel[profundidad]
      y = bruto
    } else {
      const norm = (bruto - minBruto) / rango
      const theta =
        o.disposicion === 'circular'
          ? norm * 2 * Math.PI - Math.PI / 2
          : Math.PI + norm * Math.PI
      const radio = radioNivel[Math.max(0, Math.min(profundidad, maxProfundidad))] ?? 0
      x = Math.cos(theta) * radio
      y = Math.sin(theta) * radio
    }
    cajas.push({
      id: n.unidad.id,
      unidad: n.unidad,
      x,
      y,
      ancho: n.ancho,
      alto: n.alto,
      lineas: n.lineas,
      profundidad: n.staff ? -1 : n.profundidad,
      staff: n.staff,
    })
  }

  const porId = new Map(cajas.map((c) => [c.id, c]))

  // ── Resolución de colisiones de asesores (staff) ────────────────────────
  // Los asesores se dibujan en la fila de su entegrama: si el layout los dejó
  // encima de una caja, se los corre hacia afuera y, si no alcanza, se los
  // escala un escalón hacia arriba (o hacia los costados en horizontal).
  function hayChoque(a: CajaUnidad, b: CajaUnidad, margen = 3): boolean {
    return (
      Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 + margen &&
      Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 + margen
    )
  }

  for (const s of cajas.filter((c) => c.staff)) {
    const ancla = porId.get(s.unidad.asesoraA ?? '')
    if (!ancla) continue

    if (o.disposicion === 'vertical') {
      const derecha = s.x >= ancla.x
      // 1) Despegar del entegrama al que asesora, manteniéndose en su fila.
      const limite = ancla.x + (derecha ? 1 : -1) * (ancla.ancho / 2 + 28 + s.ancho / 2)
      s.x = derecha ? Math.max(s.x, limite) : Math.min(s.x, limite)

      // 2) Despegar del resto de cajas de la misma fila; si no alcanza, escalón.
      let escalon = 0
      for (let intento = 0; intento < 8; intento++) {
        const choque = cajas.find((otra) => otra !== s && hayChoque(s, otra))
        if (!choque) break
        const mismaFila = Math.abs(choque.y - s.y) < 1
        if (mismaFila && intento < 4) {
          s.x = derecha
            ? Math.max(s.x, choque.x + choque.ancho / 2 + 28 + s.ancho / 2)
            : Math.min(s.x, choque.x - choque.ancho / 2 - 28 - s.ancho / 2)
        } else {
          escalon++
          s.y = ancla.y - (s.alto + 14) * escalon
        }
      }
    } else if (o.disposicion === 'horizontal') {
      const abajo = s.y >= ancla.y
      const limite = ancla.y + (abajo ? 1 : -1) * (ancla.alto / 2 + 28 + s.alto / 2)
      s.y = abajo ? Math.max(s.y, limite) : Math.min(s.y, limite)
      let escalon = 0
      for (let intento = 0; intento < 8; intento++) {
        const choque = cajas.find((otra) => otra !== s && hayChoque(s, otra))
        if (!choque) break
        const mismaFila = Math.abs(choque.x - s.x) < 1
        if (mismaFila && intento < 4) {
          s.y = abajo
            ? Math.max(s.y, choque.y + choque.alto / 2 + 28 + s.alto / 2)
            : Math.min(s.y, choque.y - choque.alto / 2 - 28 - s.alto / 2)
        } else {
          escalon++
          s.x = ancla.x + (abajo ? 1 : -1) * (ancla.ancho / 2 + 28 + s.ancho / 2) * escalon
        }
      }
    }
  }

  function conectarRecto(a: CajaUnidad, b: CajaUnidad): Array<{ x: number; y: number }> {
    return [bordeHacia(a, b.x, b.y), bordeHacia(b, a.x, a.y)]
  }

  function conectarVertical(a: CajaUnidad, b: CajaUnidad): Array<{ x: number; y: number }> {
    const busY = a.y + a.alto / 2 + HUECO_NIVEL * 0.38
    return [
      { x: a.x, y: a.y + a.alto / 2 },
      { x: a.x, y: busY },
      { x: b.x, y: busY },
      { x: b.x, y: b.y - b.alto / 2 },
    ]
  }

  function conectarHorizontal(a: CajaUnidad, b: CajaUnidad): Array<{ x: number; y: number }> {
    const busX = a.x + a.ancho / 2 + HUECO_NIVEL * 0.38
    return [
      { x: a.x + a.ancho / 2, y: a.y },
      { x: busX, y: a.y },
      { x: busX, y: b.y },
      { x: b.x - b.ancho / 2, y: b.y },
    ]
  }

  const conectar = radial ? conectarRecto : horizontal ? conectarHorizontal : conectarVertical

  // ── Líneas ──────────────────────────────────────────────────────────────
  const lineas: LineaOrganigrama[] = []

  for (const n of nodos) {
    const caja = porId.get(n.unidad.id)
    if (!caja) continue

    if (n.padreId && !n.staff) {
      const padre = porId.get(n.padreId)
      if (padre) {
        lineas.push({ tipo: 'autoridad', de: padre.id, a: caja.id, puntos: conectar(padre, caja) })
      }
    }

    const funcionalId = n.unidad.funcionalA
    if (funcionalId) {
      const fuente = porId.get(funcionalId)
      if (fuente && fuente.id !== caja.id) {
        lineas.push({ tipo: 'funcional', de: fuente.id, a: caja.id, puntos: conectar(fuente, caja) })
      }
    }

    if (n.staff && n.padreId) {
      const ancla = porId.get(n.padreId)
      if (ancla) {
        if (o.disposicion === 'vertical') {
          // Línea de staff: sale del costado del entegrama y llega al costado
          // del asesor, con un codo para no atravesar otras cajas.
          const derecha = caja.x >= ancla.x
          const bordeAncla = ancla.x + (derecha ? ancla.ancho / 2 : -ancla.ancho / 2)
          const busX = bordeAncla + (derecha ? 16 : -16)
          const bordeStaff = caja.x + (derecha ? -caja.ancho / 2 : caja.ancho / 2)
          lineas.push({
            tipo: 'staff',
            de: ancla.id,
            a: caja.id,
            puntos: [
              { x: bordeAncla, y: ancla.y },
              { x: busX, y: ancla.y },
              { x: busX, y: caja.y },
              { x: bordeStaff, y: caja.y },
            ],
          })
        } else {
          lineas.push({
            tipo: 'staff',
            de: ancla.id,
            a: caja.id,
            puntos: [bordeHacia(ancla, caja.x, caja.y), bordeHacia(caja, ancla.x, ancla.y)],
          })
        }
      }
    }
  }

  // ── Separadores de nivel (solo disposiciones rectangulares) ─────────────
  const separadores: Array<{ posicion: number; profundidad: number }> = []
  if (!radial) {
    for (let d = 0; d < maxProfundidad; d++) {
      const posicion =
        (centroNivel[d] + (horizontal ? anchoNivel[d] : altoNivel[d]) / 2 +
          centroNivel[d + 1] -
          (horizontal ? anchoNivel[d + 1] : altoNivel[d + 1]) / 2) /
        2
      separadores.push({ posicion, profundidad: d + 1 })
    }
  }

  // ── Normalizar a coordenadas positivas ──────────────────────────────────
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const c of cajas) {
    minX = Math.min(minX, c.x - c.ancho / 2)
    minY = Math.min(minY, c.y - c.alto / 2)
    maxX = Math.max(maxX, c.x + c.ancho / 2)
    maxY = Math.max(maxY, c.y + c.alto / 2)
  }

  const dx = MARGEN - minX
  const dy = MARGEN - minY
  for (const c of cajas) {
    c.x += dx
    c.y += dy
  }
  for (const l of lineas) {
    for (const p of l.puntos) {
      p.x += dx
      p.y += dy
    }
  }
  for (const s of separadores) s.posicion += horizontal ? dx : dy

  return {
    ancho: maxX - minX + MARGEN * 2,
    alto: maxY - minY + MARGEN * 2,
    cajas,
    lineas,
    separadores,
  }
}
