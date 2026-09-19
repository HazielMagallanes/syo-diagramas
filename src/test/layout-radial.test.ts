import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analizar } from '../core/analizar'
import { diagramarOrganigrama } from '../core/layout/organigrama'
import { renderizar } from '../core/render'
import type { Disposicion, Organigrama } from '../core/tipos'

const DIR = 'diagramas'
const archivos = readdirSync(DIR)
  .filter((f) => f.startsWith('organigrama-') && f.endsWith('.yaml'))
  .sort()

function conDisposicion(archivo: string, disposicion: Disposicion): Organigrama {
  const d = analizar(readFileSync(join(DIR, archivo), 'utf8'))
  if (d.tipo !== 'organigrama') throw new Error(`${archivo} no es un organigrama`)
  return { ...d, disposicion }
}

function solapan(
  a: { x: number; y: number; ancho: number; alto: number },
  b: { x: number; y: number; ancho: number; alto: number },
): boolean {
  return (
    Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 - 1 &&
    Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 - 1
  )
}

describe('layout radial (circular y semicircular)', () => {
  it('hay ejemplos para probar', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(4)
  })

  for (const disposicion of ['circular', 'semicircular'] as const) {
    for (const archivo of archivos) {
      it(`${archivo} · ${disposicion}: sin solapamientos, anillos parejos y dentro del lienzo`, () => {
        const organigrama = conDisposicion(archivo, disposicion)
        const diseno = diagramarOrganigrama(organigrama)

        // 1) Ningún par de cajas se superpone.
        for (let i = 0; i < diseno.cajas.length; i++) {
          for (let j = i + 1; j < diseno.cajas.length; j++) {
            const a = diseno.cajas[i]
            const b = diseno.cajas[j]
            if (solapan(a, b)) {
              throw new Error(`Se superponen "${a.unidad.nombre}" y "${b.unidad.nombre}"`)
            }
          }
        }

        // 2) Todos los nodos de la misma profundidad están al mismo radio.
        const raiz = diseno.cajas.find(
          (c) => c.unidad.padre === undefined && c.unidad.vinculo !== 'staff',
        )
        expect(raiz).toBeDefined()
        const radioPorNivel = new Map<number, number>()
        for (const c of diseno.cajas) {
          const radio = Math.hypot(c.x - raiz!.x, c.y - raiz!.y)
          const esperado = radioPorNivel.get(c.profundidad)
          if (esperado === undefined) radioPorNivel.set(c.profundidad, radio)
          else expect(Math.abs(radio - esperado)).toBeLessThan(0.05)
        }
        // El radio crece con la profundidad.
        const niveles = [...radioPorNivel.entries()].sort((a, b) => a[0] - b[0])
        for (let i = 1; i < niveles.length; i++) {
          expect(niveles[i][1]).toBeGreaterThan(niveles[i - 1][1])
        }

        // 3) Todo queda dentro del lienzo.
        for (const c of diseno.cajas) {
          expect(c.x - c.ancho / 2).toBeGreaterThanOrEqual(-0.5)
          expect(c.y - c.alto / 2).toBeGreaterThanOrEqual(-0.5)
          expect(c.x + c.ancho / 2).toBeLessThanOrEqual(diseno.ancho + 0.5)
          expect(c.y + c.alto / 2).toBeLessThanOrEqual(diseno.alto + 0.5)
        }

        // 4) La raíz queda centrada (circular) o al pie y centrada (semicircular).
        if (disposicion === 'circular') {
          expect(Math.abs(raiz!.x - diseno.ancho / 2)).toBeLessThan(0.5)
          expect(Math.abs(raiz!.y - diseno.alto / 2)).toBeLessThan(0.5)
          expect(Math.abs(diseno.ancho - diseno.alto)).toBeLessThan(0.5)
        } else {
          expect(Math.abs(raiz!.x - diseno.ancho / 2)).toBeLessThan(0.5)
          expect(raiz!.y).toBeGreaterThan(diseno.alto / 2)
        }

        // 5) Renderiza.
        const { svg } = renderizar(organigrama)
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg).toContain('</svg>')
      })
    }
  }

  it('las guías de nivel se dibujan solo con mostrarNiveles', () => {
    const base = conDisposicion(archivos[0], 'circular')
    const conGuias = renderizar({ ...base, mostrarNiveles: true }, { leyenda: false }).svg
    expect(conGuias).toContain('<circle')
    expect(conGuias).toContain('Nivel 2')

    const sinGuias = renderizar({ ...base, mostrarNiveles: false }, { leyenda: false }).svg
    expect(sinGuias).not.toContain('<circle')
  })

  it('el staff de la raíz ya no se apila sobre ella', () => {
    const conStaff = archivos.find((f) => f.includes('computer-service'))
    expect(conStaff).toBeDefined()
    const diseno = diagramarOrganigrama(conDisposicion(conStaff as string, 'circular'))
    const raiz = diseno.cajas.find((c) => c.unidad.vinculo !== 'staff' && !c.unidad.padre)
    const asesores = diseno.cajas.filter((c) => c.staff)
    expect(asesores.length).toBeGreaterThan(0)
    for (const a of asesores) {
      const distancia = Math.hypot(a.x - raiz!.x, a.y - raiz!.y)
      expect(distancia).toBeGreaterThan(a.alto)
    }
  })
})
