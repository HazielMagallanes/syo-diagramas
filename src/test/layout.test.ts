import { describe, expect, it } from 'vitest'
import { analizar } from '../core/analizar'
import { diagramarDfd } from '../core/layout/dfd'
import { diagramarOrganigrama } from '../core/layout/organigrama'
import type { Disposicion, Dfd, Organigrama } from '../core/tipos'

const ORGANIGRAMA: string = `
tipo: organigrama
titulo: Layout
disposicion: vertical
unidades:
  - id: raiz
    nombre: Gerencia General
  - id: a
    nombre: Área A
    padre: raiz
  - id: b
    nombre: Área B
    padre: raiz
  - id: a1
    nombre: Subárea A1
    padre: a
  - id: a2
    nombre: Subárea A2
    padre: a
  - id: asesor
    nombre: Asesoría
    vinculo: staff
    asesoraA: raiz
    lado: der
  - id: asesor2
    nombre: Otra Asesoría
    vinculo: staff
    asesoraA: raiz
    lado: der
`

function conDisposicion(disposicion: Disposicion): Organigrama {
  const d = analizar(ORGANIGRAMA.replace('disposicion: vertical', `disposicion: ${disposicion}`))
  if (d.tipo !== 'organigrama') throw new Error('no es organigrama')
  return d
}

function haySolapamiento(cajas: Array<{ x: number; y: number; ancho: number; alto: number }>): boolean {
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i]
      const b = cajas[j]
      const solapanX = Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 - 1
      const solapanY = Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 - 1
      if (solapanX && solapanY) return true
    }
  }
  return false
}

describe('layout de organigrama', () => {
  it('vertical: mismo nivel ⇒ misma altura', () => {
    const d = diagramarOrganigrama(conDisposicion('vertical'))
    const profundidades = new Map<string, number>()
    const raiz = d.cajas.find((c) => c.id === 'raiz')
    expect(raiz).toBeDefined()
    for (const c of d.cajas.filter((c) => !c.staff)) profundidades.set(c.id, c.profundidad)
    const yPorProfundidad = new Map<number, number>()
    for (const c of d.cajas.filter((c) => !c.staff)) {
      const y = yPorProfundidad.get(c.profundidad)
      if (y === undefined) yPorProfundidad.set(c.profundidad, c.y)
      else expect(Math.abs(c.y - y)).toBeLessThan(0.01)
    }
    // La raíz está arriba del todo
    expect(raiz!.y).toBeLessThan(d.cajas.find((c) => c.id === 'a')!.y)
  })

  it('vertical: sin solapamientos', () => {
    const d = diagramarOrganigrama(conDisposicion('vertical'))
    expect(haySolapamiento(d.cajas)).toBe(false)
  })

  it('las cajas quedan dentro del lienzo', () => {
    for (const disposicion of ['vertical', 'horizontal', 'circular', 'semicircular'] as const) {
      const d = diagramarOrganigrama(conDisposicion(disposicion))
      expect(d.ancho).toBeGreaterThan(0)
      expect(d.alto).toBeGreaterThan(0)
      for (const c of d.cajas) {
        expect(Number.isFinite(c.x)).toBe(true)
        expect(Number.isFinite(c.y)).toBe(true)
        expect(c.x - c.ancho / 2).toBeGreaterThanOrEqual(-0.5)
        expect(c.y - c.alto / 2).toBeGreaterThanOrEqual(-0.5)
        expect(c.x + c.ancho / 2).toBeLessThanOrEqual(d.ancho + 0.5)
        expect(c.y + c.alto / 2).toBeLessThanOrEqual(d.alto + 0.5)
      }
    }
  })

  it('el primer asesor del mismo lado queda a la altura de su entegrama', () => {
    const d = diagramarOrganigrama(conDisposicion('vertical'))
    const raiz = d.cajas.find((c) => c.id === 'raiz')!
    const asesor = d.cajas.find((c) => c.id === 'asesor')!
    expect(Math.abs(asesor.y - raiz.y)).toBeLessThan(0.01)
  })

  it('las líneas conectan cajas existentes y tienen al menos 2 puntos', () => {
    const d = diagramarOrganigrama(conDisposicion('vertical'))
    const ids = new Set(d.cajas.map((c) => c.id))
    for (const l of d.lineas) {
      expect(ids.has(l.de)).toBe(true)
      expect(ids.has(l.a)).toBe(true)
      expect(l.puntos.length).toBeGreaterThanOrEqual(2)
    }
    expect(d.lineas.some((l) => l.tipo === 'staff')).toBe(true)
    expect(d.lineas.some((l) => l.tipo === 'autoridad')).toBe(true)
  })

  it('respeta la línea de dependencia funcional', () => {
    const d = analizar(`
tipo: organigrama
titulo: Funcional
disposicion: vertical
unidades:
  - id: a
    nombre: A
  - id: b
    nombre: B
    padre: a
    funcionalA: c
  - id: c
    nombre: C
    padre: a
`) as Organigrama
    const diseno = diagramarOrganigrama(d)
    const funcional = diseno.lineas.filter((l) => l.tipo === 'funcional')
    expect(funcional).toHaveLength(1)
    expect(funcional[0].de).toBe('c')
    expect(funcional[0].a).toBe('b')
  })

  it('ordena hermanos con el campo orden', () => {
    const d = analizar(`
tipo: organigrama
titulo: Orden
disposicion: vertical
unidades:
  - id: raiz
    nombre: Raíz
  - id: segundo
    nombre: Segundo
    padre: raiz
    orden: 2
  - id: primero
    nombre: Primero
    padre: raiz
    orden: 1
`) as Organigrama
    const diseno = diagramarOrganigrama(d)
    const primero = diseno.cajas.find((c) => c.id === 'primero')!
    const segundo = diseno.cajas.find((c) => c.id === 'segundo')!
    expect(primero.x).toBeLessThan(segundo.x)
  })
})

describe('layout de DFD', () => {
  const DFD: Dfd = analizar(`
tipo: dfd
titulo: Layout DFD
nivel: 1
nodos:
  - id: e
    tipo: entidad
    nombre: Cliente
  - id: p1
    tipo: proceso
    numero: "1"
    nombre: Registrar pedido
  - id: p2
    tipo: proceso
    numero: "2"
    nombre: Facturar
  - id: a
    tipo: almacen
    nombre: Pedidos
flujos:
  - de: e
    a: p1
    etiqueta: Pedido
  - de: p1
    a: a
    etiqueta: Guarda pedido
  - de: a
    a: p2
    etiqueta: Pedidos pendientes
  - de: p2
    a: e
    etiqueta: Factura
`) as Dfd

  it('no solapa cajas y produce aristas con puntos', () => {
    const d = diagramarDfd(DFD)
    expect(d.cajas).toHaveLength(4)
    expect(haySolapamiento(d.cajas)).toBe(false)
    expect(d.aristas).toHaveLength(4)
    for (const arista of d.aristas) expect(arista.puntos.length).toBeGreaterThanOrEqual(2)
  })

  it('las etiquetas de flujo quedan a mitad de camino', () => {
    const d = diagramarDfd(DFD)
    const conEtiqueta = d.aristas.filter((a) => a.etiqueta)
    expect(conEtiqueta).toHaveLength(4)
    for (const a of conEtiqueta) {
      const puntos = a.puntos
      const minX = Math.min(...puntos.map((p) => p.x))
      const maxX = Math.max(...puntos.map((p) => p.x))
      expect(a.etiqueta!.x).toBeGreaterThanOrEqual(minX - 1)
      expect(a.etiqueta!.x).toBeLessThanOrEqual(maxX + 1)
    }
  })
})
