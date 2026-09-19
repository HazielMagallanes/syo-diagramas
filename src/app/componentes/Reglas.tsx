import { REGLAS } from '../../core/reglas/catalogo'
import type { Severidad } from '../../core/tipos'

const CHIP: Record<Severidad, string> = {
  error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  advertencia: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  info: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export function Reglas() {
  const categorias = ['Organigrama', 'DFD', 'General'] as const

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reglas de la cátedra</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Estas son las reglas que valida el editor, con su referencia a las diapositivas de la materia.
        </p>
      </header>

      {categorias.map((categoria) => (
        <div key={categoria}>
          <h3 className="mb-3 border-b border-slate-200 pb-1 text-base font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            {categoria}
          </h3>
          <ul className="space-y-3">
            {REGLAS.filter((r) => r.categoria === categoria).map((r) => (
              <li key={r.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{r.id}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHIP[r.severidad]}`}>
                    {r.severidad}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.descripcion}</p>
                <p className="mt-1 text-xs text-slate-400">{r.referencia}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
