import { useMemo, useState } from 'react'
import { renderizar } from '../../core/render'
import { validar } from '../../core/reglas'
import type { DiagramaDeEjemplo } from '../datos'

interface Props {
  ejemplos: DiagramaDeEjemplo[]
  onAbrir: (id: string) => void
}

function Etiqueta({ diagrama }: { diagrama: DiagramaDeEjemplo }) {
  if (!diagrama.diagrama) return <span className="text-xs text-red-500">inválido</span>
  if (diagrama.diagrama.tipo === 'organigrama') {
    return (
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
        Organigrama · {diagrama.diagrama.disposicion}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      DFD · Nivel {diagrama.diagrama.nivel}
    </span>
  )
}

function Tarjeta({ ejemplo, onAbrir }: { ejemplo: DiagramaDeEjemplo; onAbrir: (id: string) => void }) {
  const [verMiniatura, setVerMiniatura] = useState(false)

  const miniatura = useMemo(() => {
    if (!verMiniatura || !ejemplo.diagrama) return null
    try {
      return renderizar(ejemplo.diagrama, { leyenda: false }).svg
    } catch {
      return null
    }
  }, [verMiniatura, ejemplo.diagrama])

  const alertas = useMemo(() => {
    if (!ejemplo.diagrama) return { errores: ejemplo.errores.length, advertencias: 0 }
    const hallazgos = validar(ejemplo.diagrama)
    return {
      errores: hallazgos.filter((h) => h.severidad === 'error').length,
      advertencias: hallazgos.filter((h) => h.severidad === 'advertencia').length,
    }
  }, [ejemplo])

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      onMouseEnter={() => setVerMiniatura(true)}
      onFocus={() => setVerMiniatura(true)}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
          {ejemplo.diagrama?.titulo ?? ejemplo.id}
        </h3>
        <Etiqueta diagrama={ejemplo} />
      </header>

      <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-white dark:border-slate-700">
        {miniatura ? (
          <div
            className="lienzo h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: miniatura }}
          />
        ) : (
          <span className="text-xs text-slate-400">Pasá el mouse para previsualizar</span>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-mono text-slate-400">{ejemplo.archivo}</span>
        <span className="flex items-center gap-2">
          {alertas.errores > 0 && <span className="text-red-500">{alertas.errores} ✗</span>}
          {alertas.advertencias > 0 && <span className="text-amber-500">{alertas.advertencias} ⚠</span>}
          <button
            type="button"
            onClick={() => onAbrir(ejemplo.id)}
            className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Abrir
          </button>
        </span>
      </footer>
    </article>
  )
}

export function Galeria({ ejemplos, onAbrir }: Props) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Diagramas de ejemplo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ejercicios resueltos de la cátedra: organigramas y DFD con las reglas aplicadas.
          </p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {ejemplos.length} diagramas · editá el YAML y exportá en SVG, PNG o PDF
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ejemplos.map((e) => (
          <Tarjeta key={e.id} ejemplo={e} onAbrir={onAbrir} />
        ))}
      </div>
    </section>
  )
}
