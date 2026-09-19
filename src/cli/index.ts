#!/usr/bin/env node
/**
 * CLI de syo-diagramas: pensado para que lo usen agentes y CI.
 *
 *   pnpm validar [archivos...] [--json]
 *   pnpm render <archivo> [--salida <dir>] [--monocromo] [--sin-leyenda]
 *   pnpm reglas [--json]
 *   pnpm nuevo <organigrama|dfd> <slug> [--titulo "Título"]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { aYaml, analizarSeguro, reglaPorId, renderizar, validar } from '../core/index'
import { plantillaDfd, plantillaOrganigrama } from '../core/plantillas'
import type { Diagrama, Hallazgo } from '../core/index'
import { REGLAS } from '../core/reglas/catalogo'

const ICONO: Record<string, string> = { error: '✗', advertencia: '⚠', info: 'ℹ' }

function ayuda(): void {
  console.log(`Uso: syo-diagramas <comando> [opciones]

Comandos:
  validar [archivos...]   Valida contra las reglas de la cátedra (default: diagramas/)
      --json              Salida JSON (para agentes)
  render <archivo>        Renderiza a SVG
      --salida <dir>      Directorio de salida (default: salida/)
      --monocromo         Sin colores (para fotocopia)
      --sin-leyenda       Sin leyenda al pie
  reglas                  Lista las reglas de la cátedra
      --json              Salida JSON
  nuevo <tipo> <slug>     Crea una plantilla en diagramas/
      --titulo "..."      Título del diagrama
`)
}

function argValor(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre)
  return i >= 0 ? args[i + 1] : undefined
}

function tieneFlag(args: string[], nombre: string): boolean {
  return args.includes(nombre)
}

function archivosDe(entradas: string[]): string[] {
  const rutas: string[] = []
  for (const entrada of entradas) {
    const ruta = resolve(entrada)
    if (!existsSync(ruta)) {
      console.error(`No existe: ${entrada}`)
      continue
    }
    if (statSync(ruta).isDirectory()) {
      for (const d of readdirSync(ruta, { withFileTypes: true })) {
        if (d.isFile() && ['.yaml', '.yml', '.json'].includes(extname(d.name))) {
          rutas.push(join(ruta, d.name))
        }
      }
    } else {
      rutas.push(ruta)
    }
  }
  return rutas.sort()
}

function leerDiagrama(ruta: string): { diagrama?: Diagrama; errores: string[] } {
  const texto = readFileSync(ruta, 'utf8')
  const r = analizarSeguro(texto)
  return r.ok ? { diagrama: r.diagrama, errores: [] } : { errores: r.errores }
}

function imprimirHallazgo(h: Hallazgo, sangria = '  '): void {
  const regla = reglaPorId(h.reglaId)
  const referencia = regla ? ` [${regla.referencia}]` : ''
  console.log(`${sangria}${ICONO[h.severidad] ?? '·'} ${h.reglaId} (${h.severidad}) ${h.mensaje}${referencia}`)
}

function comandoValidar(args: string[]): number {
  const json = tieneFlag(args, '--json')
  const entradas = args.filter((a) => !a.startsWith('--'))
  const archivos = archivosDe(entradas.length > 0 ? entradas : ['diagramas'])

  if (archivos.length === 0) {
    console.error('No se encontraron archivos .yaml/.yml/.json')
    return 1
  }

  let errores = 0
  let advertencias = 0
  const salida: Array<{ archivo: string; ok: boolean; erroresEstructura: string[]; hallazgos: Hallazgo[] }> = []

  for (const archivo of archivos) {
    const nombre = basename(archivo)
    const { diagrama, errores: erroresEstructura } = leerDiagrama(archivo)
    if (!diagrama) {
      errores += erroresEstructura.length
      salida.push({ archivo: nombre, ok: false, erroresEstructura, hallazgos: [] })
      if (!json) {
        console.log(`✗ ${nombre}`)
        for (const e of erroresEstructura) console.log(`    ${e}`)
      }
      continue
    }
    const hallazgos = validar(diagrama)
    const errs = hallazgos.filter((h) => h.severidad === 'error')
    const advs = hallazgos.filter((h) => h.severidad === 'advertencia')
    errores += errs.length
    advertencias += advs.length
    salida.push({ archivo: nombre, ok: errs.length === 0, erroresEstructura: [], hallazgos })

    if (!json) {
      const marca = errs.length > 0 ? '✗' : advs.length > 0 ? '⚠' : '✔'
      console.log(`${marca} ${nombre}`)
      for (const h of hallazgos.filter((x) => x.severidad !== 'info')) imprimirHallazgo(h)
    }
  }

  if (json) {
    console.log(JSON.stringify(salida, null, 2))
  } else {
    console.log(
      `\n${errores} error/es, ${advertencias} advertencia/s en ${archivos.length} archivo/s.`,
    )
  }
  return errores > 0 ? 1 : 0
}

function comandoRender(args: string[]): number {
  const entrada = args.find((a) => !a.startsWith('--'))
  if (!entrada) {
    console.error('Falta el archivo a renderizar.')
    return 1
  }
  const { diagrama, errores } = leerDiagrama(resolve(entrada))
  if (!diagrama) {
    console.error('El diagrama tiene errores de estructura:')
    for (const e of errores) console.error(`  - ${e}`)
    return 1
  }
  const hallazgos = validar(diagrama)
  const erroresReglas = hallazgos.filter((h) => h.severidad === 'error')
  for (const h of hallazgos.filter((x) => x.severidad !== 'info')) imprimirHallazgo(h)
  if (erroresReglas.length > 0) {
    console.error(`\nNo se renderiza: hay ${erroresReglas.length} error/es de reglas de la cátedra.`)
    return 1
  }

  const salida = resolve(argValor(args, '--salida') ?? 'salida')
  mkdirSync(salida, { recursive: true })
  const slug = basename(entrada).replace(/\.(ya?ml|json)$/i, '')
  const { svg, ancho, alto } = renderizar(diagrama, {
    monocromo: tieneFlag(args, '--monocromo'),
    leyenda: !tieneFlag(args, '--sin-leyenda'),
  })
  const destino = join(salida, `${slug}.svg`)
  writeFileSync(destino, svg, 'utf8')
  console.log(`✔ ${destino} (${Math.round(ancho)}×${Math.round(alto)})`)
  return 0
}

function markdownReglas(): string {
  const lineas: string[] = [
    '# Reglas de la cátedra SyO',
    '',
    '> Generado automáticamente desde `src/core/reglas/catalogo.ts` (`pnpm reglas --markdown`). No editar a mano.',
    '',
  ]
  for (const categoria of ['Organigrama', 'DFD', 'General'] as const) {
    lineas.push(`## ${categoria}`, '')
    for (const r of REGLAS.filter((x) => x.categoria === categoria)) {
      lineas.push(`### ${r.id} — ${r.titulo} *(${r.severidad})*`, '', r.descripcion, '', `Referencia: ${r.referencia}`, '')
    }
  }
  return lineas.join('\n')
}

function comandoReglas(args: string[]): number {
  if (tieneFlag(args, '--json')) {
    console.log(JSON.stringify(REGLAS, null, 2))
    return 0
  }
  if (tieneFlag(args, '--markdown')) {
    console.log(markdownReglas())
    return 0
  }
  const categorias = ['Organigrama', 'DFD', 'General'] as const
  for (const categoria of categorias) {
    console.log(`\n${categoria}`)
    for (const r of REGLAS.filter((x) => x.categoria === categoria)) {
      console.log(`  ${r.id} [${r.severidad}] ${r.titulo}`)
      console.log(`      ${r.descripcion}`)
      console.log(`      Ref: ${r.referencia}`)
    }
  }
  return 0
}

function comandoNuevo(args: string[]): number {
  const [tipo, slug] = args.filter((a) => !a.startsWith('--'))
  if (!tipo || !slug) {
    console.error('Uso: pnpm nuevo <organigrama|dfd> <slug> [--titulo "..."]')
    return 1
  }
  if (tipo !== 'organigrama' && tipo !== 'dfd') {
    console.error(`Tipo inválido: ${tipo}. Usá "organigrama" o "dfd".`)
    return 1
  }
  const titulo = argValor(args, '--titulo') ?? (tipo === 'organigrama' ? 'Nuevo organigrama' : 'Nuevo DFD')
  const prefijo = tipo === 'organigrama' ? 'organigrama' : 'dfd'
  const destino = resolve('diagramas', `${prefijo}-${slug}.yaml`)
  if (existsSync(destino)) {
    console.error(`Ya existe: ${destino}`)
    return 1
  }
  mkdirSync(resolve('diagramas'), { recursive: true })
  const contenido = tipo === 'organigrama' ? plantillaOrganigrama(titulo) : plantillaDfd(titulo)
  // Se pasa por el parser para garantizar que la plantilla sea válida.
  const chequeo = analizarSeguro(contenido)
  if (!chequeo.ok) {
    console.error('La plantilla generada no es válida (bug):', chequeo.errores)
    return 1
  }
  writeFileSync(destino, tipo === 'organigrama' ? contenido : aYaml(chequeo.diagrama as Diagrama), 'utf8')
  console.log(`✔ ${destino}`)
  return 0
}

function main(): number {
  const [comando, ...args] = process.argv.slice(2)
  switch (comando) {
    case 'validar':
      return comandoValidar(args)
    case 'render':
      return comandoRender(args)
    case 'reglas':
      return comandoReglas(args)
    case 'nuevo':
      return comandoNuevo(args)
    default:
      ayuda()
      return comando ? 1 : 0
  }
}

process.exit(main())
