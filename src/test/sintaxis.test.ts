import { describe, expect, it } from 'vitest'
import {
  CAMPOS_DFD_FLUJO,
  CAMPOS_DFD_NODO,
  CAMPOS_ORGANIGRAMA,
  CAMPOS_UNIDAD,
  CONSEJOS,
  EJEMPLO_DFD,
  EJEMPLO_ORGANIGRAMA,
} from '../app/utiles/sintaxis'
import { analizarSeguro } from '../core/analizar'

describe('hoja de sintaxis', () => {
  it('los ejemplos son YAML válido', () => {
    const organigrama = analizarSeguro(EJEMPLO_ORGANIGRAMA)
    expect(organigrama.errores).toEqual([])
    expect(organigrama.diagrama?.tipo).toBe('organigrama')

    const dfd = analizarSeguro(EJEMPLO_DFD)
    expect(dfd.errores).toEqual([])
    expect(dfd.diagrama?.tipo).toBe('dfd')
  })

  it('documenta los campos principales', () => {
    const campos = [
      ...CAMPOS_ORGANIGRAMA,
      ...CAMPOS_UNIDAD,
      ...CAMPOS_DFD_NODO,
      ...CAMPOS_DFD_FLUJO,
    ].map((c) => c.campo)
    for (const esperado of [
      'tipo',
      'titulo',
      'disposicion',
      'unidades[]',
      'padre',
      'vinculo',
      'asesoraA',
      'funcionalA',
      'numero',
      'detalle',
      'de',
      'a',
      'etiqueta',
    ]) {
      expect(campos).toContain(esperado)
    }
  })

  it('no filtra reglas de la cátedra (modo examen)', () => {
    const texto = [
      EJEMPLO_ORGANIGRAMA,
      EJEMPLO_DFD,
      ...CONSEJOS,
      ...CAMPOS_ORGANIGRAMA.map((c) => `${c.campo} ${c.descripcion}`),
      ...CAMPOS_UNIDAD.map((c) => `${c.campo} ${c.descripcion}`),
      ...CAMPOS_DFD_NODO.map((c) => `${c.campo} ${c.descripcion}`),
      ...CAMPOS_DFD_FLUJO.map((c) => `${c.campo} ${c.descripcion}`),
    ].join('\n')
    expect(texto).not.toMatch(/ORG-\d|DFD-\d/)
  })
})
