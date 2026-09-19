import type { Hallazgo, Organigrama, Unidad } from '../tipos'

/** Normaliza un nombre para comparar. */
function norm(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, ' ')
}

function esSAEnTexto(texto: string): boolean {
  return /\bs\.?\s?a\.?\b/i.test(texto) || /sociedad an[oó]nima/i.test(texto)
}

/**
 * Valida un organigrama contra las reglas de la cátedra.
 * Devuelve hallazgos con severidad error / advertencia / info.
 */
export function validarOrganigrama(o: Organigrama): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  const porId = new Map<string, Unidad>()
  const repetidos: string[] = []

  for (const u of o.unidades) {
    if (porId.has(u.id)) repetidos.push(u.id)
    else porId.set(u.id, u)
  }
  if (repetidos.length > 0) {
    hallazgos.push({
      reglaId: 'ORG-01',
      severidad: 'error',
      mensaje: `Ids repetidos: ${repetidos.join(', ')}.`,
      nodos: repetidos,
    })
  }

  // ── Referencias existentes (ORG-02) ──────────────────────────────────────
  for (const u of o.unidades) {
    for (const [campo, valor] of [
      ['padre', u.padre],
      ['funcionalA', u.funcionalA],
      ['asesoraA', u.asesoraA],
    ] as const) {
      if (!valor) continue
      if (valor === u.id) {
        hallazgos.push({
          reglaId: 'ORG-02',
          severidad: 'error',
          mensaje: `"${u.nombre}" se referencia a sí misma en ${campo}.`,
          nodos: [u.id],
        })
      } else if (!porId.has(valor)) {
        hallazgos.push({
          reglaId: 'ORG-02',
          severidad: 'error',
          mensaje: `"${u.nombre}": ${campo} apunta a "${valor}", que no existe.`,
          nodos: [u.id],
        })
      }
    }
  }

  const hijosDe = (id: string): Unidad[] =>
    o.unidades.filter((u) => (u.vinculo ?? 'autoridad') !== 'staff' && u.padre === id)

  // ── Staff bien definido (ORG-06) y fuera de la jerarquía (ORG-07) ───────
  for (const u of o.unidades) {
    if (u.vinculo === 'staff') {
      if (!u.asesoraA) {
        hallazgos.push({
          reglaId: 'ORG-06',
          severidad: 'error',
          mensaje: `La unidad de staff "${u.nombre}" necesita indicar a quién asesora (asesoraA).`,
          nodos: [u.id],
        })
      }
      if (u.padre) {
        hallazgos.push({
          reglaId: 'ORG-07',
          severidad: 'advertencia',
          mensaje: `"${u.nombre}" es staff: no debe tener dependencia jerárquica (padre). Se grafica al costado de "${u.asesoraA ?? '?'}".`,
          nodos: [u.id],
        })
      }
      const aCargo = hijosDe(u.id)
      if (aCargo.length > 0) {
        hallazgos.push({
          reglaId: 'ORG-07',
          severidad: 'advertencia',
          mensaje: `"${u.nombre}" es staff pero tiene unidades a cargo (${aCargo.length}): el staff asesora, no manda.`,
          nodos: [u.id, ...aCargo.map((u2) => u2.id)],
        })
      }
    } else if (u.asesoraA && !porId.has(u.asesoraA)) {
      hallazgos.push({
        reglaId: 'ORG-06',
        severidad: 'error',
        mensaje: `"${u.nombre}" tiene asesoraA pero su vínculo no es staff; definí vinculo: staff o quitá asesoraA.`,
        nodos: [u.id],
      })
    }
  }

  // ── Raíz única (ORG-03) ─────────────────────────────────────────────────
  const raices = o.unidades.filter((u) => (u.vinculo ?? 'autoridad') !== 'staff' && !u.padre)
  if (raices.length !== 1) {
    hallazgos.push({
      reglaId: 'ORG-03',
      severidad: 'error',
      mensaje:
        raices.length === 0
          ? 'No hay ninguna unidad raíz: toda unidad tiene padre (¿ciclo?).'
          : `Hay ${raices.length} unidades sin padre (${raices.map((r) => r.nombre).join(', ')}). La estructura debe tener una sola cabeza.`,
      nodos: raices.map((r) => r.id),
    })
  }

  // ── Ciclos (ORG-04) ─────────────────────────────────────────────────────
  // Cada unidad tiene a lo sumo un padre: alcanza con seguir la cadena y
  // detectar la primera repetición.
  const enCiclo = new Set<string>()
  for (const u of o.unidades) {
    const indices = new Map<string, number>()
    const camino: string[] = []
    let actual: Unidad | undefined = u
    while (actual) {
      if (indices.has(actual.id)) {
        const desde = indices.get(actual.id) as number
        for (const id of camino.slice(desde)) enCiclo.add(id)
        break
      }
      indices.set(actual.id, camino.length)
      camino.push(actual.id)
      actual = actual.padre ? porId.get(actual.padre) : undefined
    }
  }
  if (enCiclo.size > 0) {
    hallazgos.push({
      reglaId: 'ORG-04',
      severidad: 'error',
      mensaje: `Hay un ciclo de dependencia jerárquica entre: ${[...enCiclo].join(', ')}.`,
      nodos: [...enCiclo],
    })
  }

  // ── Entegramas aislados (ORG-05) ────────────────────────────────────────
  if (raices.length === 1) {
    const alcanzados = new Set<string>()
    const pila = [raices[0].id]
    while (pila.length > 0) {
      const id = pila.pop() as string
      if (alcanzados.has(id)) continue
      alcanzados.add(id)
      for (const h of hijosDe(id)) pila.push(h.id)
    }
    const aislados = o.unidades.filter(
      (u) => (u.vinculo ?? 'autoridad') !== 'staff' && !alcanzados.has(u.id),
    )
    if (aislados.length > 0) {
      hallazgos.push({
        reglaId: 'ORG-05',
        severidad: 'error',
        mensaje: `Entegramas aislados (no cuelgan de la raíz): ${aislados.map((u) => u.nombre).join(', ')}.`,
        nodos: aislados.map((u) => u.id),
      })
    }
  }

  // ── S.A.: AGA y Directorio (ORG-08 / ORG-09) ────────────────────────────
  const tituloEsSA = esSAEnTexto(o.titulo)
  if (tituloEsSA && !o.esSA) {
    hallazgos.push({
      reglaId: 'ORG-09',
      severidad: 'advertencia',
      mensaje:
        'El título indica que es una S.A.: activá esSA: true para que se exijan la AGA y el Directorio.',
    })
  }
  if (o.esSA) {
    const tieneAGA = o.unidades.some((u) => /asamblea general de accionistas|\baga\b/i.test(u.nombre))
    const tieneDirectorio = o.unidades.some((u) => /^directorio\b/i.test(u.nombre.trim()))
    const faltantes: string[] = []
    if (!tieneAGA) faltantes.push('Asamblea General de Accionistas (AGA)')
    if (!tieneDirectorio) faltantes.push('Directorio')
    if (faltantes.length > 0) {
      hallazgos.push({
        reglaId: 'ORG-08',
        severidad: 'error',
        mensaje: `Es una S.A. y falta graficar: ${faltantes.join(' y ')}.`,
      })
    }
  }

  // ── Secretarias personales (ORG-10) ─────────────────────────────────────
  for (const u of o.unidades) {
    // "Secretaría" (con tilde) es la unidad orgánica; "Secretaria/o" es la persona.
    const esUnidad = /secretar[íi]a/i.test(u.nombre) && !/^secretari[ao]\b/i.test(u.nombre)
    if (/^secretari[ao]\b/i.test(u.nombre.trim()) && !esUnidad) {
      hallazgos.push({
        reglaId: 'ORG-10',
        severidad: 'advertencia',
        mensaje: `"${u.nombre}" parece una secretaria/asistente (persona): las personas no se grafican, solo las Secretarías como unidad. Si es un área, escribí "Secretaría".`,
        nodos: [u.id],
      })
    }
  }

  // ── Nombres duplicados (ORG-11) ─────────────────────────────────────────
  const porNombre = new Map<string, string[]>()
  for (const u of o.unidades) {
    const clave = norm(u.nombre)
    porNombre.set(clave, [...(porNombre.get(clave) ?? []), u.id])
  }
  for (const [, ids] of porNombre) {
    if (ids.length > 1) {
      hallazgos.push({
        reglaId: 'ORG-11',
        severidad: 'advertencia',
        mensaje: `Hay ${ids.length} unidades con el mismo nombre (${ids.join(', ')}).`,
        nodos: ids,
      })
    }
  }

  // ── Reglas garantizadas por el formato/layout (info) ────────────────────
  hallazgos.push({
    reglaId: 'GEN-01',
    severidad: 'info',
    mensaje: `Disposición única: ${o.disposicion}. No se mezclan formas de graficar.`,
  })
  hallazgos.push({
    reglaId: 'GEN-02',
    severidad: 'info',
    mensaje: 'Las unidades del mismo nivel se dibujan a la misma altura automáticamente.',
  })
  if (o.unidades.some((u) => u.vinculo === 'staff') || o.unidades.some((u) => u.funcionalA)) {
    hallazgos.push({
      reglaId: 'GEN-03',
      severidad: 'info',
      mensaje: 'Línea llena = autoridad · punteada = dependencia funcional · staff al costado = asesoramiento.',
    })
  }

  return hallazgos
}
