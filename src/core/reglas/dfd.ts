import type { Dfd, Hallazgo, NodoDfd, TipoNodoDfd } from '../tipos'

function norm(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Valida un DFD contra las reglas de la cátedra.
 */
export function validarDfd(dfd: Dfd): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  const porId = new Map<string, NodoDfd>()
  const repetidos: string[] = []

  for (const n of dfd.nodos) {
    if (porId.has(n.id)) repetidos.push(n.id)
    else porId.set(n.id, n)
  }
  if (repetidos.length > 0) {
    hallazgos.push({
      reglaId: 'DFD-08',
      severidad: 'error',
      mensaje: `Ids de nodo repetidos: ${repetidos.join(', ')}.`,
      nodos: repetidos,
    })
  }

  const tipo = (id: string): TipoNodoDfd | undefined => porId.get(id)?.tipo

  // ── Flujos bien referenciados (DFD-07) ──────────────────────────────────
  const validos: number[] = []
  dfd.flujos.forEach((f, idx) => {
    if (!porId.has(f.de) || !porId.has(f.a)) {
      hallazgos.push({
        reglaId: 'DFD-07',
        severidad: 'error',
        mensaje: `El flujo ${f.de} → ${f.a} referencia un nodo que no existe.`,
      })
      return
    }
    if (f.de === f.a) {
      hallazgos.push({
        reglaId: 'DFD-07',
        severidad: 'error',
        mensaje: `El flujo "${f.etiqueta ?? '(sin nombre)'}" sale y llega al mismo nodo (${f.de}).`,
        nodos: [f.de],
      })
      return
    }
    validos.push(idx)
  })

  // ── Nivel 0 (DFD-01) ────────────────────────────────────────────────────
  if (dfd.nivel === 0) {
    const procesos = dfd.nodos.filter((n) => n.tipo === 'proceso')
    const almacenes = dfd.nodos.filter((n) => n.tipo === 'almacen')
    if (procesos.length !== 1 || almacenes.length !== 0) {
      hallazgos.push({
        reglaId: 'DFD-01',
        severidad: 'error',
        mensaje: `El diagrama de contexto debe tener exactamente 1 proceso y 0 almacenes (tiene ${procesos.length} proceso/s y ${almacenes.length} almacén/es).`,
        nodos: [...procesos, ...almacenes].map((n) => n.id),
      })
    }
  }

  // ── Conexiones prohibidas (DFD-03/04/05/06) ─────────────────────────────
  for (const idx of validos) {
    const f = dfd.flujos[idx]
    const origen = tipo(f.de)
    const destino = tipo(f.a)
    const par = `${origen}→${destino}`
    const nombre = `"${f.etiqueta ?? '(sin nombre)'}" (${f.de} → ${f.a})`

    if (par === 'almacen→entidad' || par === 'entidad→almacen') {
      hallazgos.push({
        reglaId: 'DFD-03',
        severidad: 'error',
        mensaje: `${nombre}: entre una entidad externa y un almacén siempre debe existir un proceso.`,
        nodos: [f.de, f.a],
      })
    } else if (par === 'almacen→almacen') {
      hallazgos.push({
        reglaId: 'DFD-04',
        severidad: 'error',
        mensaje: `${nombre}: un almacén no puede conectarse directamente con otro almacén.`,
        nodos: [f.de, f.a],
      })
    } else if (par === 'entidad→entidad') {
      hallazgos.push({
        reglaId: 'DFD-05',
        severidad: 'error',
        mensaje: `${nombre}: los flujos entre entidades externas están fuera del ámbito del sistema.`,
        nodos: [f.de, f.a],
      })
    } else if (par === 'proceso→proceso' && dfd.nivel === 1) {
      hallazgos.push({
        reglaId: 'DFD-06',
        severidad: 'error',
        mensaje: `${nombre}: en el nivel 1 los procesos se comunican a través de almacenes (los flujos entre procesos se permiten desde el nivel 2).`,
        nodos: [f.de, f.a],
      })
    }
  }

  // ── Todo proceso con entrada y salida (DFD-02) ──────────────────────────
  const entradas = new Map<string, number>()
  const salidas = new Map<string, number>()
  for (const idx of validos) {
    const f = dfd.flujos[idx]
    salidas.set(f.de, (salidas.get(f.de) ?? 0) + 1)
    entradas.set(f.a, (entradas.get(f.a) ?? 0) + 1)
  }
  for (const n of dfd.nodos) {
    if (n.tipo !== 'proceso') continue
    const e = entradas.get(n.id) ?? 0
    const s = salidas.get(n.id) ?? 0
    if (e === 0 || s === 0) {
      const falta = e === 0 && s === 0 ? 'entrada y salida' : e === 0 ? 'entrada' : 'salida'
      hallazgos.push({
        reglaId: 'DFD-02',
        severidad: 'error',
        mensaje: `El proceso "${n.nombre}" no tiene ${falta}: un proceso transforma datos, no es origen ni final.`,
        nodos: [n.id],
      })
    }
  }

  // ── Numeración (DFD-09) ─────────────────────────────────────────────────
  if (dfd.nivel >= 1) {
    const vistos = new Set<string>()
    for (const n of dfd.nodos) {
      if (n.tipo !== 'proceso') continue
      if (!n.numero) {
        hallazgos.push({
          reglaId: 'DFD-09',
          severidad: 'advertencia',
          mensaje: `El proceso "${n.nombre}" no tiene número.`,
          nodos: [n.id],
        })
        continue
      }
      const formatoOk =
        dfd.nivel === 1 ? /^\d+$/.test(n.numero) : /^\d+(\.\d+)+$/.test(n.numero)
      if (!formatoOk) {
        hallazgos.push({
          reglaId: 'DFD-09',
          severidad: 'advertencia',
          mensaje: `Numeración inesperada "${n.numero}" para nivel ${dfd.nivel} (se espera ${dfd.nivel === 1 ? '1, 2, 3…' : '1.1, 1.2…'}).`,
          nodos: [n.id],
        })
      }
      if (vistos.has(n.numero)) {
        hallazgos.push({
          reglaId: 'DFD-09',
          severidad: 'advertencia',
          mensaje: `El número de proceso "${n.numero}" está repetido.`,
          nodos: [n.id],
        })
      }
      vistos.add(n.numero)
    }
    if (dfd.nivel >= 2 && !dfd.procesoPadre) {
      hallazgos.push({
        reglaId: 'DFD-09',
        severidad: 'advertencia',
        mensaje: 'En nivel 2+ conviene indicar procesoPadre para saber qué proceso se está explotando.',
      })
    }
  }

  // ── Flujos sin nombre (DFD-10) ──────────────────────────────────────────
  for (const idx of validos) {
    const f = dfd.flujos[idx]
    if (f.etiqueta?.trim()) continue
    const tocaAlmacen = tipo(f.de) === 'almacen' || tipo(f.a) === 'almacen'
    if (!tocaAlmacen) {
      hallazgos.push({
        reglaId: 'DFD-10',
        severidad: 'advertencia',
        mensaje: `El flujo ${f.de} → ${f.a} no tiene nombre (solo se omite al leer/escribir un almacén completo).`,
        nodos: [f.de, f.a],
      })
    }
  }

  // ── Almacenes aislados (DFD-11) ─────────────────────────────────────────
  if (dfd.nivel >= 1) {
    for (const n of dfd.nodos) {
      if (n.tipo !== 'almacen') continue
      const toca = validos.some((idx) => {
        const f = dfd.flujos[idx]
        return f.de === n.id || f.a === n.id
      })
      if (!toca) {
        hallazgos.push({
          reglaId: 'DFD-11',
          severidad: 'advertencia',
          mensaje: `El almacén "${n.nombre}" no tiene ningún flujo de entrada o salida.`,
          nodos: [n.id],
        })
      }
    }
  }

  // ── Nombres duplicados (DFD-12) ─────────────────────────────────────────
  const porNombre = new Map<string, string[]>()
  for (const n of dfd.nodos) {
    if (n.tipo === 'entidad') continue // las entidades externas pueden repetirse
    const clave = `${n.tipo}:${norm(n.nombre)}`
    porNombre.set(clave, [...(porNombre.get(clave) ?? []), n.id])
  }
  for (const [, ids] of porNombre) {
    if (ids.length > 1) {
      hallazgos.push({
        reglaId: 'DFD-12',
        severidad: 'advertencia',
        mensaje: `Hay ${ids.length} nodos con el mismo nombre (${ids.join(', ')}).`,
        nodos: ids,
      })
    }
  }

  // ── Flujos duplicados (DFD-13) ──────────────────────────────────────────
  const porFlujo = new Map<string, number[]>()
  for (const idx of validos) {
    const f = dfd.flujos[idx]
    const clave = `${f.de}→${f.a}|${norm(f.etiqueta ?? '')}`
    porFlujo.set(clave, [...(porFlujo.get(clave) ?? []), idx])
  }
  for (const [, idxs] of porFlujo) {
    if (idxs.length > 1) {
      const f = dfd.flujos[idxs[0]]
      hallazgos.push({
        reglaId: 'DFD-13',
        severidad: 'advertencia',
        mensaje: `Hay ${idxs.length} flujos idénticos ${f.de} → ${f.a}${f.etiqueta ? ` ("${f.etiqueta}")` : ''}.`,
        nodos: [f.de, f.a],
      })
    }
  }

  // ── Recordatorios (info) ────────────────────────────────────────────────
  hallazgos.push({
    reglaId: 'DFD-14',
    severidad: 'info',
    mensaje:
      'Conservación de datos: verificá que lo que entra a cada proceso alcance para producir sus salidas.',
  })
  hallazgos.push({
    reglaId: 'DFD-15',
    severidad: 'info',
    mensaje: 'No se modela hardware: el DFD muestra flujos de datos lógicos, no dispositivos físicos.',
  })

  return hallazgos
}
