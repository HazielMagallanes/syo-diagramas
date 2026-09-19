import { flextree } from 'd3-flextree'
import { altoBloque, anchoTexto, envolver, envolverDuro } from '../medir'
import type { Organigrama, Unidad } from '../tipos'

const TAMANO = 13
const PAD_X = 12
const PAD_Y = 8
const MIN_ANCHO = 116
const ANCHO_TEXTO_MAX = 150
const ANCHO_TEXTO_STAFF = 132
const HUECO_HERMANOS = 26
const HUECO_NIVEL = 58
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

export interface EtiquetaRadial {
  modo: 'horizontal' | 'radial'
  lineas: string[]
  tamano: number
  /** Rotación en grados (solo en modo radial). */
  rotacion: number
  /** En horizontal: coordenadas absolutas. En radial: distancia sobre el radio. */
  x: number
  y: number
  ancla: 'start' | 'middle' | 'end'
  altoLinea: number
}

/** Celda de un anillo radial (sector de corona): círculo para la raíz. */
export interface CeldaRadial {
  id: string
  unidad: Unidad
  profundidad: number
  r0: number
  r1: number
  theta0: number
  theta1: number
  staff: boolean
  etiqueta: EtiquetaRadial
}

export interface DisenoOrganigrama {
  ancho: number
  alto: number
  cajas: CajaUnidad[]
  lineas: LineaOrganigrama[]
  /** Posiciones (y en vertical, x en horizontal) de los separadores entre niveles. */
  separadores: Array<{ posicion: number; profundidad: number }>
  /** Celdas (sectores concéntricos) de las disposiciones radiales. */
  celdas?: CeldaRadial[]
  /** Centro del círculo o del abanico en las disposiciones radiales. */
  centro?: { x: number; y: number }
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

/** Punto del centro de una celda radial (para los cordones de dependencia). */
function centroideCelda(celda: CeldaRadial, centro: { x: number; y: number }): { x: number; y: number } {
  if (celda.profundidad === 0) return { x: centro.x, y: centro.y }
  const r = (celda.r0 + celda.r1) / 2
  const t = (celda.theta0 + celda.theta1) / 2
  return { x: centro.x + Math.cos(t) * r, y: centro.y + Math.sin(t) * r }
}

/**
 * Ubica la etiqueta de una celda radial: horizontal si el bloque entra en la
 * celda; si no, rotada siguiendo el radio, achicando la fuente hasta que entre.
 */
function ubicarEtiquetaRadial(
  n: NodoDatos,
  r0: number,
  r1: number,
  theta0: number,
  theta1: number,
  centro: { x: number; y: number },
  semicircular: boolean,
): EtiquetaRadial {
  const nombre = n.unidad.nombre

  if (n.profundidad === 0) {
    // La raíz: disco completo (circular) o medio disco (semicircular, con la
    // etiqueta centrada dentro de la medialuna).
    const anchoDisponible = semicircular ? 2 * r1 - 30 : 1.7 * r1
    const lineas = envolver(nombre, Math.max(90, anchoDisponible), 14)
    return {
      modo: 'horizontal',
      lineas,
      tamano: 14,
      rotacion: 0,
      x: centro.x,
      y: semicircular ? centro.y + r1 / 2 + 4 : centro.y,
      ancla: 'middle',
      altoLinea: 14 * 1.25,
    }
  }

  const tMid = (theta0 + theta1) / 2
  const delta = theta1 - theta0
  const rMid = (r0 + r1) / 2
  const altoDisponible = r1 - r0 - 10
  // Para etiquetas horizontales manda la cuerda del borde interno (la celda
  // se angosta hacia el centro).
  const cuerda = Math.max(30, 2 * r0 * Math.sin(Math.max(0.001, Math.min(delta, Math.PI)) / 2) - 12)

  // 1) Horizontal, si el bloque entra sin cortar palabras: ancho limitado por
  //    la cuerda del borde interno Y por el espesor del anillo (cerca del eje
  //    horizontal el ancho de la etiqueta ocupa radio, no ángulo).
  const anchoHorizontal = Math.min(cuerda, Math.max(60, r1 - r0 - 12))
  if (anchoHorizontal >= 44) {
    for (const tamano of [12, 11, 10, 9]) {
      const lineas = envolver(nombre, anchoHorizontal, tamano)
      const anchoMax = Math.max(...lineas.map((l) => anchoTexto(l, tamano)))
      const alto = lineas.length * tamano * 1.2
      if (anchoMax <= anchoHorizontal && alto <= altoDisponible && lineas.length <= 3) {
        return {
          modo: 'horizontal',
          lineas,
          tamano,
          rotacion: 0,
          x: centro.x + Math.cos(tMid) * rMid,
          y: centro.y + Math.sin(tMid) * rMid,
          ancla: 'middle',
          altoLinea: tamano * 1.2,
        }
      }
    }
  }

  // 2) Rotada siguiendo el radio (se centra en el anillo; en la mitad
  //    izquierda se invierte para que no quede cabeza abajo).
  const espesorTexto = Math.max(40, r1 - r0 - 16)
  const izquierda = Math.cos(tMid) < 0
  const rotacion = izquierda ? (tMid * 180) / Math.PI + 180 : (tMid * 180) / Math.PI
  const disponibleTangencial = Math.max(14, delta * r0 - 8)
  for (const tamano of [12, 11, 10, 9, 8]) {
    const lineas = envolver(nombre, espesorTexto, tamano)
    const anchoMax = Math.max(...lineas.map((l) => anchoTexto(l, tamano)))
    const alto = lineas.length * tamano * 1.2
    if (alto <= disponibleTangencial && anchoMax <= espesorTexto + 2) {
      return {
        modo: 'radial',
        lineas,
        tamano,
        rotacion,
        x: izquierda ? -rMid : rMid,
        y: 0,
        ancla: 'middle',
        altoLinea: tamano * 1.2,
      }
    }
  }

  // 3) Último recurso: cortar palabras con la fuente mínima.
  return {
    modo: 'radial',
    lineas: envolverDuro(nombre, espesorTexto, 9),
    tamano: 9,
    rotacion,
    x: izquierda ? -rMid : rMid,
    y: 0,
    ancla: 'middle',
    altoLinea: 10.8,
  }
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

  // Centro de cada nivel para las disposiciones rectangulares.
  const centroNivel = new Array<number>(maxProfundidad + 1).fill(0)
  if (!radial) {
    let acumulado = MARGEN
    for (let d = 0; d <= maxProfundidad; d++) {
      const mitad = (horizontal ? anchoNivel[d] : altoNivel[d]) / 2
      acumulado += mitad
      centroNivel[d] = acumulado
      acumulado += mitad + HUECO_NIVEL
    }
  }

  const anclas = new Map<string, NodoDatos>()
  for (const n of nodos) anclas.set(n.unidad.id, n)

  // ── Posiciones ──────────────────────────────────────────────────────────
  const cajas: CajaUnidad[] = []
  const celdas: CeldaRadial[] = []
  let centroRadial: { x: number; y: number } | undefined
  let anchoRadial = 0
  let altoRadial = 0

  if (radial) {
    // Disposición circular/semicircular de la cátedra: anillos concéntricos
    // divididos en celdas. La raíz ocupa el disco central y cada nivel es un
    // anillo cuyas celdas reparten el ángulo de su padre.
    const span = o.disposicion === 'circular' ? Math.PI * 2 : Math.PI
    const thetaIni = o.disposicion === 'circular' ? -Math.PI / 2 : 0

    // 1) Radios: un anillo por nivel, con espesor según las etiquetas.
    const espesor = new Array<number>(maxProfundidad + 1).fill(0)
    const etiquetaRaiz = envolver(raiz.unidad.nombre, 150, 14)
    espesor[0] = Math.max(
      54,
      Math.min(110, Math.max(...etiquetaRaiz.map((l) => anchoTexto(l, 14))) / 2 + 28),
    )
    for (let d = 1; d <= maxProfundidad; d++) {
      const anchos = nodos
        .filter((n) => n.profundidad === d)
        .map((n) => anchoTexto(n.unidad.nombre, 11))
      espesor[d] = Math.max(52, Math.min(120, Math.max(0, ...anchos) + 26))
    }
    const radioFin = new Array<number>(maxProfundidad + 1).fill(0)
    for (let d = 0; d <= maxProfundidad; d++) {
      radioFin[d] = (d === 0 ? 0 : radioFin[d - 1]) + espesor[d]
    }

    // 2) Mínimo angular de cada subárbol (bottom-up): lo que necesita su
    //    etiqueta y, si tiene hijos, la suma de lo que necesitan los hijos.
    const pesoHoja = new Map<string, number>()
    const calcularPeso = (n: NodoDatos): number => {
      const p = n.hijos.length === 0 ? 1 : n.hijos.reduce((s, h) => s + calcularPeso(h), 0)
      pesoHoja.set(n.unidad.id, p)
      return p
    }
    calcularPeso(raiz)

    const minimo = new Map<string, number>()
    const calcularMinimo = (n: NodoDatos): number => {
      let propio = 0
      if (n.profundidad > 0) {
        const r0 = radioFin[n.profundidad - 1]
        const espesorTexto = Math.max(24, radioFin[n.profundidad] - r0 - 16)
        const lineas = Math.max(1, Math.ceil(anchoTexto(n.unidad.nombre, 10) / espesorTexto))
        propio = Math.max(0.04, (lineas * 12 + 8) / Math.max(40, r0))
      }
      const deHijos = n.hijos.reduce((s, h) => s + calcularMinimo(h), 0)
      const total = Math.max(propio, deHijos)
      minimo.set(n.unidad.id, total)
      return total
    }
    calcularMinimo(raiz)

    // 3) Reparto top-down: cada hijo recibe su mínimo más una parte del
    //    sobrante en proporción a su cantidad de hojas.
    const rango = new Map<string, [number, number]>()
    const repartir = (n: NodoDatos, desde: number, hasta: number): void => {
      rango.set(n.unidad.id, [desde, hasta])
      if (n.hijos.length === 0) return
      const disponibles = hasta - desde
      const minimos = n.hijos.map((h) => Math.max(minimo.get(h.unidad.id) ?? 0.02, 0.001))
      const sumaMin = minimos.reduce((a, b) => a + b, 0)
      const sobrante = Math.max(0, disponibles - sumaMin)
      const pesos = n.hijos.map((h) => pesoHoja.get(h.unidad.id) ?? 1)
      const sumaPesos = pesos.reduce((a, b) => a + b, 0) || 1
      let cursor = desde
      n.hijos.forEach((h, i) => {
        const sector =
          i === n.hijos.length - 1 ? hasta - cursor : minimos[i] + (sobrante * pesos[i]) / sumaPesos
        repartir(h, cursor, cursor + sector)
        cursor += sector
      })
    }
    repartir(raiz, thetaIni, thetaIni + span)

    // 4) Lienzo y centro: en circular la raíz queda en el centro exacto; en
    //    semicircular el abanico abre hacia abajo, con la raíz arriba.
    const radioTotal = radioFin[maxProfundidad]
    if (o.disposicion === 'circular') {
      anchoRadial = 2 * (radioTotal + MARGEN)
      altoRadial = anchoRadial
      centroRadial = { x: anchoRadial / 2, y: altoRadial / 2 }
    } else {
      anchoRadial = 2 * (radioTotal + MARGEN)
      const cy = MARGEN + 16
      altoRadial = cy + radioTotal + MARGEN
      centroRadial = { x: anchoRadial / 2, y: cy }
    }

    for (const n of nodos) {
      const [t0, t1] = rango.get(n.unidad.id) ?? [thetaIni, thetaIni + span]
      const r0 = n.profundidad === 0 ? 0 : radioFin[n.profundidad - 1]
      const r1 = radioFin[n.profundidad]
      celdas.push({
        id: n.unidad.id,
        unidad: n.unidad,
        profundidad: n.profundidad,
        r0,
        r1,
        theta0: t0,
        theta1: t1,
        staff: n.staff,
        etiqueta: ubicarEtiquetaRadial(
          n,
          r0,
          r1,
          t0,
          t1,
          centroRadial,
          o.disposicion === 'semicircular',
        ),
      })
    }
  } else {
    // Disposiciones rectangulares: una coordenada sale del árbol ordenado
    // (flextree) y la otra del nivel.
    for (const n of nodos) {
      const bruto = posiciones.get(n.unidad.id) ?? 0
      const profundidad = n.staff
        ? (anclas.get(n.padreId ?? '')?.profundidad ?? n.profundidad - 1)
        : n.profundidad
      let x = 0
      let y = 0
      if (o.disposicion === 'vertical') {
        x = bruto
        const anclaNodo = n.staff ? anclas.get(n.padreId ?? '') : undefined
        const baseY = anclaNodo ? centroNivel[anclaNodo.profundidad] : centroNivel[profundidad]
        // Los asesores del mismo lado se escalonan hacia arriba para que sus
        // líneas no crucen las cajas de los otros.
        y = n.staff ? baseY - (n.staffIndice ?? 0) * (n.alto + 12) : centroNivel[profundidad]
      } else {
        x = centroNivel[profundidad]
        y = bruto
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

  // ── Cordones de dependencia funcional en radial ─────────────────────────
  if (radial && centroRadial) {
    const celdaPorId = new Map(celdas.map((c) => [c.id, c]))
    for (const c of celdas) {
      const objetivo = c.unidad.funcionalA
      if (!objetivo) continue
      const otra = celdaPorId.get(objetivo)
      if (!otra || otra.id === c.id) continue
      lineas.push({
        tipo: 'funcional',
        de: c.id,
        a: otra.id,
        puntos: [centroideCelda(c, centroRadial), centroideCelda(otra, centroRadial)],
      })
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

  // ── Normalizar (solo rectangular: el radial ya está centrado) ───────────
  if (radial) {
    return {
      ancho: anchoRadial,
      alto: altoRadial,
      cajas,
      lineas,
      separadores,
      celdas,
      centro: centroRadial,
    }
  }

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
