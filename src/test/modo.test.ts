import { describe, expect, it } from 'vitest'
import { debeBloquearRender } from '../app/utiles/modo'
import { analizar } from '../core/analizar'
import { renderizar } from '../core/render'
import { validar } from '../core/reglas'
import type { Dfd, Hallazgo } from '../core/tipos'

const error: Hallazgo = { reglaId: 'ORG-03', severidad: 'error', mensaje: 'x' }
const advertencia: Hallazgo = { reglaId: 'ORG-07', severidad: 'advertencia', mensaje: 'x' }

describe('modo examen (graficador puro)', () => {
  it('sin hallazgos no bloquea', () => {
    expect(debeBloquearRender([], false)).toBe(false)
    expect(debeBloquearRender([], true)).toBe(false)
  })

  it('con errores de reglas bloquea fuera del modo examen', () => {
    expect(debeBloquearRender([error], false)).toBe(true)
  })

  it('las advertencias no bloquean', () => {
    expect(debeBloquearRender([advertencia], false)).toBe(false)
  })

  it('en modo examen nunca bloquea: la app no corrige', () => {
    expect(debeBloquearRender([error], true)).toBe(false)
    expect(debeBloquearRender([error, advertencia], true)).toBe(false)
  })

  it('en modo examen un diagrama con errores de reglas igual se dibuja', () => {
    // DFD de nivel 1 con un flujo directo entre procesos (viola DFD-06).
    const dfd = analizar(`
tipo: dfd
titulo: Prueba
nivel: 1
nodos:
  - id: e
    tipo: entidad
    nombre: Cliente
  - id: p1
    tipo: proceso
    numero: "1"
    nombre: Uno
  - id: p2
    tipo: proceso
    numero: "2"
    nombre: Dos
  - id: a
    tipo: almacen
    nombre: Almacén
flujos:
  - de: e
    a: p1
    etiqueta: Entrada
  - de: p1
    a: p2
    etiqueta: Prohibido
  - de: p2
    a: a
    etiqueta: Guarda
  - de: a
    a: p1
    etiqueta: Lee
`) as Dfd
    const hallazgos = validar(dfd)
    expect(hallazgos.some((h) => h.severidad === 'error')).toBe(true)
    // En modo examen no se bloquea y el SVG se genera igual.
    expect(debeBloquearRender(hallazgos, true)).toBe(false)
    const { svg } = renderizar(dfd, { leyenda: false })
    expect(svg).toContain('<svg')
    expect(svg).toContain('Dos')
  })
})

