import { describe, expect, it } from 'vitest'
import { analizar } from '../core/analizar'
import { validar } from '../core/reglas'
import type { Organigrama } from '../core/tipos'

function validarYaml(yaml: string) {
  const d = analizar(yaml)
  if (d.tipo !== 'organigrama') throw new Error('Se esperaba un organigrama')
  return validar(d)
}

function base(extra: string): string {
  return `
tipo: organigrama
titulo: Prueba
disposicion: vertical
unidades:
${extra}
`
}

describe('reglas de organigrama', () => {
  it('ORG-01: detecta ids repetidos', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: a
    nombre: B
`))
    expect(h.some((x) => x.reglaId === 'ORG-01' && x.severidad === 'error')).toBe(true)
  })

  it('ORG-02: detecta referencias inexistentes', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
    padre: fantasma
`))
    expect(h.some((x) => x.reglaId === 'ORG-02')).toBe(true)
  })

  it('ORG-03: exige una única raíz', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: b
    nombre: B
`))
    expect(h.some((x) => x.reglaId === 'ORG-03')).toBe(true)
  })

  it('ORG-04: detecta ciclos', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
    padre: b
  - id: b
    nombre: B
    padre: a
`))
    const ciclo = h.find((x) => x.reglaId === 'ORG-04')
    expect(ciclo).toBeDefined()
    expect(ciclo?.nodos?.sort()).toEqual(['a', 'b'])
  })

  it('ORG-05: detecta entegramas aislados', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: b
    nombre: B
    padre: c
  - id: c
    nombre: C
    padre: c
`))
    expect(h.some((x) => x.reglaId === 'ORG-05' || x.reglaId === 'ORG-04')).toBe(true)
  })

  it('ORG-06: staff sin asesoraA es error', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: s
    nombre: Asesor
    vinculo: staff
`))
    expect(h.some((x) => x.reglaId === 'ORG-06' && x.severidad === 'error')).toBe(true)
  })

  it('ORG-07: staff con padre jerárquico es advertencia', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: s
    nombre: Asesor
    vinculo: staff
    asesoraA: a
    padre: a
`))
    expect(h.some((x) => x.reglaId === 'ORG-07')).toBe(true)
  })

  it('ORG-08: una S.A. exige AGA y Directorio', () => {
    const h = validarYaml(`
tipo: organigrama
titulo: Prueba S.A.
disposicion: vertical
esSA: true
unidades:
  - id: gg
    nombre: Gerencia General
`)
    const hallazgo = h.find((x) => x.reglaId === 'ORG-08')
    expect(hallazgo?.severidad).toBe('error')
    expect(hallazgo?.mensaje).toMatch(/AGA/)
    expect(hallazgo?.mensaje).toMatch(/Directorio/)
  })

  it('ORG-08: no exige AGA si no es S.A.', () => {
    const h = validarYaml(base(`
  - id: gg
    nombre: Gerencia General
`))
    expect(h.some((x) => x.reglaId === 'ORG-08')).toBe(false)
  })

  it('ORG-09: avisa si el título dice S.A. pero esSA está apagado', () => {
    const h = validarYaml(`
tipo: organigrama
titulo: Materiales El Roble S.A.
disposicion: vertical
unidades:
  - id: gg
    nombre: Gerencia General
`)
    expect(h.some((x) => x.reglaId === 'ORG-09')).toBe(true)
  })

  it('ORG-10: avisa por secretarias personales y no por Secretaría', () => {
    const conPersona = validarYaml(base(`
  - id: gg
    nombre: Gerencia General
  - id: sec
    nombre: Secretaria Ejecutiva
    padre: gg
`))
    expect(conPersona.some((x) => x.reglaId === 'ORG-10')).toBe(true)

    const conUnidad = validarYaml(base(`
  - id: gg
    nombre: Gerencia General
  - id: sec
    nombre: Secretaría
    padre: gg
`))
    expect(conUnidad.some((x) => x.reglaId === 'ORG-10')).toBe(false)
  })

  it('ORG-11: avisa por nombres duplicados', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: Área
  - id: b
    nombre: área
    padre: a
`))
    expect(h.some((x) => x.reglaId === 'ORG-11')).toBe(true)
  })

  it('siempre incluye las reglas informativas garantizadas', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
`))
    expect(h.some((x) => x.reglaId === 'GEN-01')).toBe(true)
    expect(h.some((x) => x.reglaId === 'GEN-02')).toBe(true)
  })

  it('un organigrama bien formado no tiene errores', () => {
    const h = validarYaml(base(`
  - id: a
    nombre: A
  - id: b
    nombre: B
    padre: a
  - id: s
    nombre: Asesoría
    vinculo: staff
    asesoraA: a
`))
    expect(h.filter((x) => x.severidad === 'error')).toHaveLength(0)
  })
})

describe('tipos exportados', () => {
  it('Organigrama es un tipo válido', () => {
    const o: Organigrama = analizar(
      base(`
  - id: a
    nombre: A
`),
    ) as Organigrama
    expect(o.unidades).toHaveLength(1)
  })
})
