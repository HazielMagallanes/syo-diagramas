import { useMemo } from 'react'
import { analizarSeguro } from '../core/analizar'
import type { Diagrama } from '../core/tipos'

export interface DiagramaDeEjemplo {
  id: string
  archivo: string
  texto: string
  diagrama?: Diagrama
  errores: string[]
}

const modulos = import.meta.glob('../../diagramas/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const EJEMPLOS: DiagramaDeEjemplo[] = Object.entries(modulos)
  .map(([ruta, texto]) => {
    const archivo = ruta.split('/').pop() ?? ruta
    const id = archivo.replace(/\.(ya?ml|json)$/i, '')
    const r = analizarSeguro(texto)
    return {
      id,
      archivo,
      texto,
      diagrama: r.diagrama,
      errores: r.errores,
    }
  })
  .sort((a, b) => {
    const ta = a.diagrama?.tipo ?? ''
    const tb = b.diagrama?.tipo ?? ''
    if (ta !== tb) return ta.localeCompare(tb)
    return a.id.localeCompare(b.id)
  })

export function useEjemplos(): DiagramaDeEjemplo[] {
  return useMemo(() => EJEMPLOS, [])
}
