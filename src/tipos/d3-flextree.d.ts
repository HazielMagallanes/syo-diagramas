/**
 * Declaración mínima de tipos para d3-flextree (la librería no trae tipos).
 * Solo se declara lo que usa el motor de layout.
 */
declare module 'd3-flextree' {
  export interface NodoFlex<D = unknown> {
    data: D
    x: number
    y: number
    xSize: number
    ySize: number
    depth: number
    parent: NodoFlex<D> | null
    children?: NodoFlex<D>[]
    each(callback: (nodo: NodoFlex<D>) => void): void
    eachBefore(callback: (nodo: NodoFlex<D>) => void): void
    descendants(): NodoFlex<D>[]
    links(): Array<{ source: NodoFlex<D>; target: NodoFlex<D> }>
  }

  export interface LayoutFlex<D = unknown> {
    (raiz: NodoFlex<D>): NodoFlex<D>
    hierarchy(datos: D, hijos?: (d: D) => D[] | undefined): NodoFlex<D>
  }

  export function flextree<D = unknown>(opciones?: {
    nodeSize?: (nodo: NodoFlex<D>) => [number, number]
    spacing?: number | ((a: NodoFlex<D>, b: NodoFlex<D>) => number)
    children?: (d: D) => D[] | undefined
  }): LayoutFlex<D>
}
