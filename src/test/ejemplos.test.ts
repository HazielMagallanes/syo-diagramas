import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analizarSeguro, validar, renderizar } from '../core/index'

const DIR = 'diagramas'
const archivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
  .sort()

describe('ejemplos de la cátedra', () => {
  it('hay al menos 10 ejemplos', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(10)
  })

  for (const archivo of archivos) {
    describe(archivo, () => {
      const texto = readFileSync(join(DIR, archivo), 'utf8')
      const resultado = analizarSeguro(texto)

      it('tiene estructura válida', () => {
        expect(resultado.errores).toEqual([])
        expect(resultado.diagrama).toBeDefined()
      })

      it('no tiene errores de reglas de la cátedra', () => {
        const hallazgos = validar(resultado.diagrama!)
        const errores = hallazgos.filter((h) => h.severidad === 'error')
        expect(errores.map((e) => `${e.reglaId}: ${e.mensaje}`)).toEqual([])
      })

      it('renderiza un SVG con el título', () => {
        const { svg, ancho, alto } = renderizar(resultado.diagrama!)
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg).toContain('</svg>')
        expect(svg).toContain(resultado.diagrama!.titulo.replace(/&/g, '&amp;').replace(/"/g, '&quot;'))
        expect(ancho).toBeGreaterThan(100)
        expect(alto).toBeGreaterThan(100)
      })

      it('renderiza en monocromo', () => {
        const { svg } = renderizar(resultado.diagrama!, { monocromo: true, leyenda: true })
        expect(svg).not.toContain('#1d4ed8')
        expect(svg).toContain('<svg')
      })
    })
  }
})
