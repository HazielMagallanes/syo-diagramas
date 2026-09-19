import {
  CAMPOS_DFD_FLUJO,
  CAMPOS_DFD_NODO,
  CAMPOS_ORGANIGRAMA,
  CAMPOS_UNIDAD,
  CONSEJOS,
  EJEMPLO_DFD,
  EJEMPLO_ORGANIGRAMA,
  type Campo,
} from '../utiles/sintaxis'

interface Props {
  onCerrar: () => void
}

function Tabla({ titulo, campos }: { titulo: string; campos: Campo[] }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{titulo}</h4>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {campos.map((c) => (
            <tr key={c.campo} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
              <td className="w-32 py-1 pr-3 align-top font-mono font-semibold text-slate-700 dark:text-slate-200">
                {c.campo}
              </td>
              <td className="py-1 text-slate-600 dark:text-slate-300">{c.descripcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Codigo({ texto }: { texto: string }) {
  return (
    <pre className="overflow-auto rounded-md bg-slate-900 p-3 text-[11.5px] leading-relaxed text-slate-100 dark:bg-black/60">
      <code>{texto}</code>
    </pre>
  )
}

/** Hoja de ayuda con la sintaxis del YAML (formato de la herramienta). */
export function SintaxisYaml({ onCerrar }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Sintaxis del YAML"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Sintaxis del YAML
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Un archivo = un diagrama. Copiá un ejemplo y editalo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Organigrama</h3>
            <Codigo texto={EJEMPLO_ORGANIGRAMA} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Tabla titulo="Campos del diagrama" campos={CAMPOS_ORGANIGRAMA} />
              <Tabla titulo="Campos de cada unidad" campos={CAMPOS_UNIDAD} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">DFD</h3>
            <Codigo texto={EJEMPLO_DFD} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Tabla titulo="Campos de cada nodo" campos={CAMPOS_DFD_NODO} />
              <Tabla titulo="Campos de cada flujo" campos={CAMPOS_DFD_FLUJO} />
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Consejos</h3>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {CONSEJOS.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
