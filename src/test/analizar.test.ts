import { describe, expect, it } from 'vitest'
import { aJson, aYaml, analizar, analizarSeguro } from '../core/analizar'

const ORGANIGRAMA_MIN = `
tipo: organigrama
titulo: Prueba S.R.L.
disposicion: vertical
unidades:
  - id: raiz
    nombre: Gerencia General
  - id: area
    nombre: Área
    padre: raiz
`

describe('analizar', () => {
  it('parsea YAML válido', () => {
    const d = analizar(ORGANIGRAMA_MIN)
    expect(d.tipo).toBe('organigrama')
    if (d.tipo === 'organigrama') {
      expect(d.titulo).toBe('Prueba S.R.L.')
      expect(d.unidades).toHaveLength(2)
    }
  })

  it('parsea JSON válido (YAML es superconjunto de JSON)', () => {
    const json = aJson(analizar(ORGANIGRAMA_MIN))
    const d = analizar(json)
    expect(d.tipo).toBe('organigrama')
  })

  it('devuelve errores legibles para estructura inválida', () => {
    const r = analizarSeguro('tipo: organigrama\ntitulo: ""\n')
    expect(r.ok).toBe(false)
    expect(r.errores.length).toBeGreaterThan(0)
  })

  it('informa error de sintaxis YAML', () => {
    const r = analizarSeguro('tipo: dfd\nnivel: 0\nnodos:\n  - id: x\n    tipo: proceso\n   nombre: mal indentado')
    expect(r.ok).toBe(false)
    expect(r.errores[0]).toMatch(/No se pudo leer/)
  })

  it('rechaza archivos vacíos', () => {
    expect(analizarSeguro('   ').ok).toBe(false)
  })

  it('serializa a YAML legible y estable', () => {
    const d = analizar(ORGANIGRAMA_MIN)
    const yaml = aYaml(d)
    expect(yaml).toContain('tipo: organigrama')
    expect(yaml).toContain('disposicion: vertical')
    // Round-trip
    expect(aYaml(analizar(yaml))).toBe(yaml)
  })

  it('exige ids con formato seguro', () => {
    const r = analizarSeguro(`
tipo: organigrama
titulo: X
disposicion: vertical
unidades:
  - id: "con espacio"
    nombre: X
`)
    expect(r.ok).toBe(false)
    expect(r.errores.join(' ')).toMatch(/id/)
  })
})
