import { reglaPorId } from '../../core/reglas/catalogo'
import type { Hallazgo, Severidad } from '../../core/tipos'
import { contarPorSeveridad } from '../../core/reglas'

interface Props {
  hallazgos: Hallazgo[]
  seleccionado: Hallazgo | null
  onSeleccionar: (h: Hallazgo) => void
  erroresEstructura: string[]
}

const ICONO: Record<Severidad, string> = { error: '✗', advertencia: '⚠', info: 'ℹ' }

const ESTILO: Record<Severidad, string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  advertencia:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  info: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function PanelHallazgos({ hallazgos, seleccionado, onSeleccionar, erroresEstructura }: Props) {
  const conteo = contarPorSeveridad(hallazgos)

  if (erroresEstructura.length > 0) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <p className="mb-2 font-semibold">Errores de estructura</p>
        <ul className="list-inside list-disc space-y-1">
          {erroresEstructura.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }

  const visibles = hallazgos.filter((h) => h.severidad !== 'info')

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3 text-sm">
        <span className={conteo.error > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500'}>
          {conteo.error} error{conteo.error === 1 ? '' : 'es'}
        </span>
        <span className={conteo.advertencia > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
          {conteo.advertencia} advertencia{conteo.advertencia === 1 ? '' : 's'}
        </span>
        <span className="text-slate-400">{conteo.info} info</span>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          ✔ Sin observaciones: el diagrama cumple las reglas de la cátedra.
        </p>
      ) : (
        <ul className="space-y-2 overflow-auto pr-1">
          {visibles.map((h, i) => {
            const regla = reglaPorId(h.reglaId)
            const activo = seleccionado === h
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSeleccionar(h)}
                  className={`w-full rounded-md border p-2 text-left text-sm transition ${ESTILO[h.severidad]} ${
                    activo ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900' : ''
                  }`}
                >
                  <span className="mr-1 font-mono text-xs font-semibold">{ICONO[h.severidad]} {h.reglaId}</span>
                  <span className="font-medium">{regla?.titulo ?? 'Regla'}</span>
                  <p className="mt-1 leading-snug">{h.mensaje}</p>
                  {regla && <p className="mt-1 text-xs opacity-70">{regla.referencia}</p>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {hallazgos
          .filter((h) => h.severidad === 'info')
          .map((h, i) => (
            <p key={i}>
              <span className="font-mono">{h.reglaId}</span> · {h.mensaje}
            </p>
          ))}
      </div>
    </div>
  )
}
