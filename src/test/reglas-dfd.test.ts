import { describe, expect, it } from 'vitest'
import { analizar } from '../core/analizar'
import { validar } from '../core/reglas'

function validarYaml(yaml: string) {
  const d = analizar(yaml)
  if (d.tipo !== 'dfd') throw new Error('Se esperaba un DFD')
  return validar(d)
}

function dfdNivel1(cuerpo: string): string {
  return `
tipo: dfd
titulo: Prueba
nivel: 1
${cuerpo}
`
}

describe('reglas de DFD', () => {
  it('DFD-01: nivel 0 exige un solo proceso y ningún almacén', () => {
    const h = validarYaml(`
tipo: dfd
titulo: Contexto
nivel: 0
nodos:
  - id: s
    tipo: proceso
    nombre: Sistema
  - id: a
    tipo: almacen
    nombre: Datos
`)
    expect(h.some((x) => x.reglaId === 'DFD-01' && x.severidad === 'error')).toBe(true)
  })

  it('DFD-01: un contexto bien formado es válido', () => {
    const h = validarYaml(`
tipo: dfd
titulo: Contexto
nivel: 0
nodos:
  - id: s
    tipo: proceso
    nombre: Sistema
  - id: e
    tipo: entidad
    nombre: Cliente
flujos:
  - de: e
    a: s
    etiqueta: Pedido
  - de: s
    a: e
    etiqueta: Respuesta
`)
    expect(h.filter((x) => x.severidad === 'error')).toHaveLength(0)
  })

  it('DFD-02: todo proceso necesita entrada y salida', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: Cliente
  - id: p
    tipo: proceso
    numero: "1"
    nombre: Proceso con entrada y salida
  - id: p2
    tipo: proceso
    numero: "2"
    nombre: Proceso sin flujos
  - id: a
    tipo: almacen
    nombre: Almacén
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Salida
`))
    const hallazgos = h.filter((x) => x.reglaId === 'DFD-02')
    expect(hallazgos).toHaveLength(1)
    expect(hallazgos[0].nodos).toEqual(['p2'])
  })

  it('DFD-03: entidad externa no se conecta directo con almacén', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: Cliente
  - id: a
    tipo: almacen
    nombre: Almacén
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Guarda
  - de: a
    a: e
    etiqueta: Mal
`))
    expect(h.some((x) => x.reglaId === 'DFD-03' && x.severidad === 'error')).toBe(true)
  })

  it('DFD-04: almacén no se conecta con almacén', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: Cliente
  - id: a1
    tipo: almacen
    nombre: A1
  - id: a2
    tipo: almacen
    nombre: A2
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a1
    etiqueta: Guarda
  - de: a1
    a: a2
    etiqueta: Copia
  - de: a2
    a: p
    etiqueta: Lee
`))
    expect(h.some((x) => x.reglaId === 'DFD-04')).toBe(true)
  })

  it('DFD-05: no hay flujos entre entidades externas', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e1
    tipo: entidad
    nombre: E1
  - id: e2
    tipo: entidad
    nombre: E2
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e1
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Guarda
  - de: a
    a: p
    etiqueta: Lee
  - de: p
    a: e2
    etiqueta: Salida
  - de: e1
    a: e2
    etiqueta: Prohibido
`))
    expect(h.some((x) => x.reglaId === 'DFD-05')).toBe(true)
  })

  it('DFD-06: en nivel 1 no hay flujos entre procesos (sí en nivel 2)', () => {
    const cuerpo = `
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p1
    tipo: proceso
    numero: "1"
    nombre: P1
  - id: p2
    tipo: proceso
    numero: "2"
    nombre: P2
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e
    a: p1
    etiqueta: Entrada
  - de: p1
    a: p2
    etiqueta: Directo
  - de: p2
    a: a
    etiqueta: Guarda
  - de: a
    a: p1
    etiqueta: Lee
`
    const nivel1 = validarYaml(dfdNivel1(cuerpo))
    expect(nivel1.some((x) => x.reglaId === 'DFD-06')).toBe(true)

    const nivel2 = validarYaml(`
tipo: dfd
titulo: Detalle
nivel: 2
procesoPadre: "1"
${cuerpo}
`)
    expect(nivel2.some((x) => x.reglaId === 'DFD-06')).toBe(false)
  })

  it('DFD-07: flujos a nodos inexistentes y auto-flujos', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: e
    tipo: entidad
    nombre: E
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: no-existe
    etiqueta: Salida
  - de: p
    a: p
    etiqueta: Auto
`))
    expect(h.filter((x) => x.reglaId === 'DFD-07')).toHaveLength(2)
  })

  it('DFD-08: ids de nodo repetidos', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: x
    tipo: proceso
    numero: "1"
    nombre: Uno
  - id: x
    tipo: entidad
    nombre: Dos
flujos: []
`))
    expect(h.some((x) => x.reglaId === 'DFD-08')).toBe(true)
  })

  it('DFD-09: avisa numeración faltante o con formato raro', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p
    tipo: proceso
    nombre: Sin número
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Guarda
`))
    expect(h.some((x) => x.reglaId === 'DFD-09' && x.severidad === 'advertencia')).toBe(true)
  })

  it('DFD-10: flujo sin nombre solo se admite sobre almacenes', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e
    a: p
  - de: p
    a: a
`))
    const avisos = h.filter((x) => x.reglaId === 'DFD-10')
    expect(avisos).toHaveLength(1)
  })

  it('DFD-11: almacén aislado', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: a
    tipo: almacen
    nombre: A
  - id: aislado
    tipo: almacen
    nombre: Aislado
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Salida
`))
    const aviso = h.find((x) => x.reglaId === 'DFD-11')
    expect(aviso?.nodos).toEqual(['aislado'])
  })

  it('DFD-12: nombres duplicados salvo entidades externas', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e1
    tipo: entidad
    nombre: Cliente
  - id: e2
    tipo: entidad
    nombre: Cliente
  - id: p1
    tipo: proceso
    numero: "1"
    nombre: Proceso
  - id: p2
    tipo: proceso
    numero: "2"
    nombre: Proceso
  - id: a1
    tipo: almacen
    nombre: Uno
  - id: a2
    tipo: almacen
    nombre: Dos
flujos:
  - de: e1
    a: p1
    etiqueta: Entrada
  - de: p1
    a: a1
    etiqueta: Guarda
  - de: e2
    a: p2
    etiqueta: Entrada
  - de: p2
    a: a2
    etiqueta: Guarda
  - de: a2
    a: p1
    etiqueta: Lee
  - de: a1
    a: p2
    etiqueta: Lee
`))
    const duplicados = h.filter((x) => x.reglaId === 'DFD-12')
    expect(duplicados).toHaveLength(1)
    expect(duplicados[0].nodos?.sort()).toEqual(['p1', 'p2'])
  })

  it('DFD-13: flujos duplicados', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Salida
`))
    expect(h.some((x) => x.reglaId === 'DFD-13')).toBe(true)
  })

  it('siempre incluye los recordatorios informativos', () => {
    const h = validarYaml(dfdNivel1(`
nodos:
  - id: e
    tipo: entidad
    nombre: E
  - id: p
    tipo: proceso
    numero: "1"
    nombre: P
  - id: a
    tipo: almacen
    nombre: A
flujos:
  - de: e
    a: p
    etiqueta: Entrada
  - de: p
    a: a
    etiqueta: Guarda
`))
    expect(h.some((x) => x.reglaId === 'DFD-14')).toBe(true)
    expect(h.some((x) => x.reglaId === 'DFD-15')).toBe(true)
  })
})
