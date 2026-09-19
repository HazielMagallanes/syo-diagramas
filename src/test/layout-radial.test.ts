import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analizar } from '../core/analizar'
import { diagramarOrganigrama } from '../core/layout/organigrama'
import type { CeldaRadial } from '../core/layout/organigrama'
import { anchoTexto } from '../core/medir'
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

function puntoEnCelda(centro: { x: number; y: number }, r: number, t: number) {
  return { x: centro.x + r * Math.cos(t), y: centro.y + r * Math.sin(t) }
}

describe('layout radial (celdas concéntricas)', () => {
  it('hay ejemplos para probar', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(4)
  })

  for (const disposicion of ['circular', 'semicircular'] as const) {
    for (const archivo of archivos) {
      describe(`${archivo} · ${disposicion}`, () => {
        const organigrama = conDisposicion(archivo, disposicion)
        const diseno = diagramarOrganigrama(organigrama)
        const celdas = diseno.celdas ?? []
        const centro = diseno.centro
        const porId = new Map(celdas.map((c) => [c.id, c]))
        const span = disposicion === 'circular' ? Math.PI * 2 : Math.PI

        it('genera una celda por unidad y un centro', () => {
          expect(centro).toBeDefined()
          expect(celdas).toHaveLength(organigrama.unidades.length)
        })

        it('la raíz ocupa el disco central y todos los niveles tienen anillo', () => {
          const raiz = celdas.find((c) => c.profundidad === 0)
          expect(raiz).toBeDefined()
          expect(raiz!.r0).toBe(0)
          expect(raiz!.theta1 - raiz!.theta0).toBeCloseTo(span, 6)

          const anillos = new Map<number, { r0: number; r1: number }>()
          for (const c of celdas) {
            const anillo = anillos.get(c.profundidad)
            if (anillo) {
              expect(c.r0).toBeCloseTo(anillo.r0, 6)
              expect(c.r1).toBeCloseTo(anillo.r1, 6)
            } else {
              anillos.set(c.profundidad, { r0: c.r0, r1: c.r1 })
            }
          }
          // Los anillos crecen con la profundidad.
          const profundidades = [...anillos.keys()].sort((a, b) => a - b)
          for (let i = 1; i < profundidades.length; i++) {
            expect(anillos.get(profundidades[i])!.r0).toBeCloseTo(
              anillos.get(profundidades[i - 1])!.r1,
              6,
            )
          }
        })

        it('los hijos reparten exactamente el sector de su padre, en orden', () => {
          // Mismo orden que usa el layout: asesores izquierda, unidades de
          // línea (por `orden` o declaración) y asesores derecha.
          const indice = new Map(organigrama.unidades.map((u, i) => [u.id, i]))
          const ordenar = (lista: typeof organigrama.unidades) =>
            [...lista].sort((a, b) => {
              const oa = a.orden ?? Number.MAX_SAFE_INTEGER
              const ob = b.orden ?? Number.MAX_SAFE_INTEGER
              if (oa !== ob) return oa - ob
              return (indice.get(a.id) ?? 0) - (indice.get(b.id) ?? 0)
            })
          const hijosDe = (padreId: string) => {
            const staff = organigrama.unidades.filter((u) => u.vinculo === 'staff' && u.asesoraA === padreId)
            const izq = ordenar(staff.filter((s) => s.lado === 'izq'))
            const der = ordenar(staff.filter((s) => s.lado !== 'izq'))
            const autoridades = ordenar(
              organigrama.unidades.filter((u) => (u.vinculo ?? 'autoridad') !== 'staff' && u.padre === padreId),
            )
            return [...izq, ...autoridades, ...der]
          }

          for (const unidad of organigrama.unidades) {
            const celdaPadre = porId.get(unidad.id)
            if (!celdaPadre) continue
            const hijos = hijosDe(unidad.id)
            if (hijos.length === 0) continue
            const celdasHijos = hijos.map((h) => porId.get(h.id)).filter(Boolean) as CeldaRadial[]
            expect(celdasHijos).toHaveLength(hijos.length)

            // Contiguos y en orden, cubriendo todo el sector del padre.
            for (let i = 0; i < celdasHijos.length; i++) {
              if (i === 0) {
                expect(celdasHijos[i].theta0).toBeCloseTo(celdaPadre.theta0, 6)
              } else {
                expect(celdasHijos[i].theta0).toBeCloseTo(celdasHijos[i - 1].theta1, 6)
              }
              expect(celdasHijos[i].theta0).toBeGreaterThanOrEqual(celdaPadre.theta0 - 1e-9)
              expect(celdasHijos[i].theta1).toBeLessThanOrEqual(celdaPadre.theta1 + 1e-9)
            }
            expect(celdasHijos[celdasHijos.length - 1].theta1).toBeCloseTo(celdaPadre.theta1, 6)
          }
        })

        it('todas las celdas quedan dentro del lienzo', () => {
          expect(centro).toBeDefined()
          const margen = 1
          for (const c of celdas) {
            for (const t of [c.theta0, (c.theta0 + c.theta1) / 2, c.theta1]) {
              for (const r of [c.r0, c.r1]) {
                const p = puntoEnCelda(centro!, r, t)
                expect(p.x).toBeGreaterThanOrEqual(-margen)
                expect(p.y).toBeGreaterThanOrEqual(-margen)
                expect(p.x).toBeLessThanOrEqual(diseno.ancho + margen)
                expect(p.y).toBeLessThanOrEqual(diseno.alto + margen)
              }
            }
          }
        })

        it('respeta la orientación: raíz centrada (circular) o arriba (semicircular)', () => {
          expect(centro!.x).toBeCloseTo(diseno.ancho / 2, 1)
          if (disposicion === 'circular') {
            expect(centro!.y).toBeCloseTo(diseno.alto / 2, 1)
            expect(Math.abs(diseno.ancho - diseno.alto)).toBeLessThan(1)
          } else {
            expect(centro!.y).toBeLessThan(diseno.alto / 2)
            for (const c of celdas) {
              expect(c.theta0).toBeGreaterThanOrEqual(-1e-9)
              expect(c.theta1).toBeLessThanOrEqual(Math.PI + 1e-9)
            }
          }
        })

        it('las etiquetas entran en su celda', () => {
          for (const c of celdas) {
            const e = c.etiqueta
            if (e.modo === 'radial') {
              const anchoMax = Math.max(...e.lineas.map((l) => anchoTexto(l, e.tamano)))
              expect(anchoMax).toBeLessThanOrEqual(c.r1 - c.r0 + 2)
              expect(e.lineas.length * e.altoLinea).toBeLessThanOrEqual(
                Math.max(14, (c.theta1 - c.theta0) * c.r0 - 8) + 0.01,
              )
            } else if (c.profundidad > 0) {
              const r0 = c.r0
              const delta = c.theta1 - c.theta0
              const cuerda = Math.max(30, 2 * r0 * Math.sin(Math.min(delta, Math.PI) / 2) - 12)
              const anchoMax = Math.max(...e.lineas.map((l) => anchoTexto(l, e.tamano)))
              expect(anchoMax).toBeLessThanOrEqual(Math.min(cuerda, Math.max(60, c.r1 - c.r0 - 12)) + 0.01)
              expect(e.lineas.length * e.altoLinea).toBeLessThanOrEqual(c.r1 - c.r0 - 10 + 0.01)
            }
          }
        })

        it('renderiza celdas con data-nodo y etiquetas', () => {
          const { svg } = renderizar(organigrama, { leyenda: false })
          expect(svg.startsWith('<svg')).toBe(true)
          expect(svg).toContain('</svg>')
          for (const c of celdas) {
            expect(svg).toContain(`data-nodo="${c.id}"`)
          }
          // La raíz circular es un círculo; las celdas, paths.
          if (disposicion === 'circular') {
            expect(svg).toContain('<circle')
          } else {
            expect(svg).toContain('<path')
            expect(svg).not.toContain('<circle')
          }
        })
      })
    }
  }

  it('el staff se dibuja con borde punteado', () => {
    const conStaff = archivos.find((f) => f.includes('computer-service'))
    const { svg } = renderizar(conDisposicion(conStaff as string, 'circular'), { leyenda: false })
    expect(svg).toContain('stroke-dasharray="6 4"')
    const diseno = diagramarOrganigrama(conDisposicion(conStaff as string, 'circular'))
    const staff = (diseno.celdas ?? []).filter((c) => c.staff)
    expect(staff.length).toBeGreaterThan(0)
    // El asesor de la raíz no se apila sobre ella: cada celda tiene su sector.
    for (const c of staff) {
      expect(c.theta1).toBeGreaterThan(c.theta0)
      expect(c.r0).toBeGreaterThan(0)
    }
  })

  it('los anillos de una sola rama se dibujan sin costura radial', () => {
    const elRoble = archivos.find((f) => f.includes('el-roble'))
    const { svg } = renderizar(conDisposicion(elRoble as string, 'circular'), { leyenda: false })
    // Directorio y Gerencia General son anillos completos: se dibujan con evenodd.
    expect(svg).toContain('fill-rule="evenodd"')
  })

  it('la dependencia funcional se dibuja como cordón punteado', () => {
    const mafalda = archivos.find((f) => f.includes('mafalda'))
    const { svg } = renderizar(conDisposicion(mafalda as string, 'circular'), { leyenda: false })
    expect(svg).toContain('stroke-dasharray="4 4"')
    expect(svg).toContain('marker-end=')
  })
})
