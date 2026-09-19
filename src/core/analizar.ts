import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { diagramaSchema } from './esquema'
import type { Diagrama } from './tipos'

export interface ResultadoAnalisis {
  ok: boolean
  diagrama?: Diagrama
  errores: string[]
}

function formatearErrores(issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((i) => {
    const ruta = i.path.map(String).join('.')
    return ruta ? `${ruta}: ${i.message}` : i.message
  })
}

/** Analiza un texto YAML o JSON y devuelve el diagrama validado estructuralmente. */
export function analizarSeguro(texto: string): ResultadoAnalisis {
  if (!texto.trim()) return { ok: false, errores: ['El archivo está vacío'] }

  let crudo: unknown
  try {
    // YAML es un superconjunto de JSON: alcanza con un solo parser.
    crudo = parseYaml(texto)
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error)
    return { ok: false, errores: [`No se pudo leer el YAML/JSON: ${detalle}`] }
  }

  const resultado = diagramaSchema.safeParse(crudo)
  if (!resultado.success) {
    return { ok: false, errores: formatearErrores(resultado.error.issues) }
  }
  return { ok: true, diagrama: resultado.data as Diagrama, errores: [] }
}

/** Igual que `analizarSeguro`, pero lanza si hay errores. */
export function analizar(texto: string): Diagrama {
  const r = analizarSeguro(texto)
  if (!r.ok || !r.diagrama) {
    throw new Error(`Diagrama inválido:\n- ${r.errores.join('\n- ')}`)
  }
  return r.diagrama
}

/** Serializa a YAML legible (sin alias ni líneas enrolladas). */
export function aYaml(diagrama: Diagrama): string {
  const orden = diagrama.tipo === 'organigrama'
    ? ['tipo', 'titulo', 'disposicion', 'esSA', 'mostrarNiveles', 'nota', 'unidades']
    : ['tipo', 'titulo', 'nivel', 'procesoPadre', 'nota', 'nodos', 'flujos']
  const plano = JSON.parse(JSON.stringify(diagrama)) as Record<string, unknown>

  // Reordenar claves para que el archivo sea cómodo de leer/edit.
  const ordenado: Record<string, unknown> = {}
  for (const clave of orden) {
    if (plano[clave] !== undefined) ordenado[clave] = plano[clave]
  }
  for (const clave of Object.keys(plano)) {
    if (!(clave in ordenado) && plano[clave] !== undefined) ordenado[clave] = plano[clave]
  }

  return stringifyYaml(ordenado, {
    lineWidth: 0,
    aliasDuplicateObjects: false,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  })
}

export function aJson(diagrama: Diagrama): string {
  return `${JSON.stringify(diagrama, null, 2)}\n`
}
