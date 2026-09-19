import { useMemo, useRef, useState } from 'react'
import { aJson, aYaml, analizarSeguro } from '../../core/analizar'
import { renderizar } from '../../core/render'
import { hayErrores, validar } from '../../core/reglas'
import { plantillaDfd, plantillaOrganigrama } from '../../core/plantillas'
import type { Hallazgo } from '../../core/tipos'
import { EditorYaml } from './EditorYaml'
import { PanelHallazgos } from './PanelHallazgos'
import { VistaPrevia } from './VistaPrevia'
import { descargarPdf, descargarPng, descargarSvg, descargarTexto } from '../utiles/exportar'

interface Props {
  texto: string
  onChangeTexto: (texto: string) => void
  id: string
  nombreArchivo: string
  onCambiarNombre: (nombre: string) => void
  /** En producción no se muestra el botón de volver a la galería. */
  onVolver?: () => void
  oscuro: boolean
  original?: string
  onNuevo: (texto: string, id: string, nombre: string) => void
}

/** Reemplaza (o inserta) un campo de primer nivel en el YAML, sin tocar el resto. */
function conCampo(texto: string, campo: string, valor: string): string {
  const re = new RegExp(`^${campo}:.*$`, 'm')
  if (re.test(texto)) return texto.replace(re, `${campo}: ${valor}`)
  const lineas = texto.split('\n')
  lineas.splice(1, 0, `${campo}: ${valor}`)
  return lineas.join('\n')
}

function Boton({
  children,
  onClick,
  titulo,
  primario = false,
}: {
  children: React.ReactNode
  onClick: () => void
  titulo?: string
  primario?: boolean
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={
        primario
          ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
          : 'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
      }
    >
      {children}
    </button>
  )
}

export function Editor({
  texto,
  onChangeTexto,
  id,
  nombreArchivo,
  onCambiarNombre,
  onVolver,
  oscuro,
  original,
  onNuevo,
}: Props) {
  const analisis = useMemo(() => analizarSeguro(texto), [texto])
  const diagrama = analisis.diagrama
  const hallazgos = useMemo(() => (diagrama ? validar(diagrama) : []), [diagrama])
  const [seleccion, setSeleccion] = useState<Hallazgo | null>(null)
  const [monocromo, setMonocromo] = useState(false)
  const [leyenda, setLeyenda] = useState(true)
  const refLienzo = useRef<HTMLDivElement>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const render = useMemo(() => {
    if (!diagrama || hayErrores(hallazgos)) return null
    try {
      return renderizar(diagrama, { monocromo, leyenda })
    } catch {
      return null
    }
  }, [diagrama, hallazgos, monocromo, leyenda])

  const resaltados = useMemo(() => seleccion?.nodos ?? [], [seleccion])

  const slug = nombreArchivo.replace(/\.(ya?ml|json)$/i, '') || id

  function avisar(mensaje: string): void {
    setAviso(mensaje)
    setTimeout(() => setAviso(null), 2500)
  }

  function abrirArchivo(e: React.ChangeEvent<HTMLInputElement>): void {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () => {
      const contenido = String(lector.result ?? '')
      onNuevo(contenido, archivo.name.replace(/\.(ya?ml|json)$/i, ''), archivo.name)
    }
    lector.readAsText(archivo)
    e.target.value = ''
  }

  async function exportarPdf(): Promise<void> {
    const svg = refLienzo.current?.querySelector('svg')
    if (!svg) return avisar('Primero generá una vista previa válida.')
    try {
      await descargarPdf(svg as SVGSVGElement, `${slug}.pdf`)
      avisar('PDF generado.')
    } catch {
      avisar('No se pudo generar el PDF.')
    }
  }

  const esOrganigrama = diagrama?.tipo === 'organigrama'

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2">
        {onVolver && (
          <>
            <Boton onClick={onVolver}>← Galería</Boton>
            <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-600" />
          </>
        )}
        <Boton
          onClick={() => onNuevo(plantillaOrganigrama(), `nuevo-organigrama-${Date.now()}`, 'organigrama.yaml')}
        >
          + Organigrama
        </Boton>
        <Boton onClick={() => onNuevo(plantillaDfd(), `nuevo-dfd-${Date.now()}`, 'dfd.yaml')}>
          + DFD
        </Boton>

        <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
          Abrir…
          <input type="file" accept=".yaml,.yml,.json" className="hidden" onChange={abrirArchivo} />
        </label>

        <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-600" />

        <Boton onClick={() => descargarSvg(render?.svg ?? '', `${slug}.svg`)} titulo="Descargar SVG vectorial">
          SVG
        </Boton>
        <Boton
          onClick={() => {
            if (!render) return avisar('Primero corregí los errores.')
            void descargarPng(render.svg, `${slug}.png`)
          }}
          titulo="Descargar PNG (2x)"
        >
          PNG
        </Boton>
        <Boton onClick={() => void exportarPdf()} titulo="Descargar PDF A4">
          PDF
        </Boton>

        <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-600" />

        <Boton
          onClick={() => {
            if (!diagrama) return avisar('El YAML tiene errores; se descarga tal cual está.')
            return descargarTexto(aYaml(diagrama), `${slug}.yaml`)
          }}
        >
          YAML
        </Boton>
        <Boton
          onClick={() => {
            if (!diagrama) return avisar('El YAML tiene errores; no se puede exportar a JSON.')
            return descargarTexto(aJson(diagrama), `${slug}.json`, 'application/json')
          }}
        >
          JSON
        </Boton>

        <div className="ml-auto flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={monocromo} onChange={(e) => setMonocromo(e.target.checked)} />
            Monocromo
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={leyenda} onChange={(e) => setLeyenda(e.target.checked)} />
            Leyenda
          </label>
        </div>
      </div>

      {/* Opciones rápidas del diagrama */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60">
        <input
          value={nombreArchivo}
          onChange={(e) => onCambiarNombre(e.target.value)}
          className="w-56 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          placeholder="nombre-archivo.yaml"
        />
        {esOrganigrama && (
          <>
            <label className="flex items-center gap-1.5">
              Disposición
              <select
                value={diagrama.disposicion}
                onChange={(e) => onChangeTexto(conCampo(texto, 'disposicion', e.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="vertical">vertical (piramidal)</option>
                <option value="horizontal">horizontal</option>
                <option value="circular">circular</option>
                <option value="semicircular">semicircular</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={diagrama.esSA ?? false}
                onChange={(e) => onChangeTexto(conCampo(texto, 'esSA', String(e.target.checked)))}
              />
              S.A. (exige AGA y Directorio)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={diagrama.mostrarNiveles ?? false}
                onChange={(e) => onChangeTexto(conCampo(texto, 'mostrarNiveles', String(e.target.checked)))}
              />
              Mostrar niveles
            </label>
          </>
        )}
        {diagrama?.tipo === 'dfd' && (
          <span className="text-slate-500 dark:text-slate-400">
            Nivel {diagrama.nivel}
            {diagrama.procesoPadre ? ` · proceso padre: ${diagrama.procesoPadre}` : ''}
          </span>
        )}
        {original !== undefined && texto !== original && (
          <button
            type="button"
            onClick={() => onChangeTexto(original)}
            className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
          >
            restaurar original
          </button>
        )}
        {aviso && <span className="text-xs text-slate-500 dark:text-slate-400">{aviso}</span>}
      </div>

      {/* Paneles */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(360px,1.4fr)_minmax(280px,0.8fr)]">
        <div className="min-h-[320px] lg:min-h-0">
          <EditorYaml valor={texto} onChange={onChangeTexto} oscuro={oscuro} />
        </div>
        <VistaPrevia ref={refLienzo} svg={render?.svg ?? null} resaltados={resaltados} />
        <div className="min-h-[240px] overflow-hidden rounded-md border border-slate-200 p-3 lg:min-h-0 dark:border-slate-700">
          <PanelHallazgos
            hallazgos={hallazgos}
            erroresEstructura={analisis.errores}
            seleccionado={seleccion}
            onSeleccionar={(h) => setSeleccion(h)}
          />
        </div>
      </div>
    </section>
  )
}
