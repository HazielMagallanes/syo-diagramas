import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Galeria } from './componentes/Galeria'
import { Reglas } from './componentes/Reglas'
import { EJEMPLOS } from './datos'

// El editor (con CodeMirror) se carga solo cuando hace falta.
const Editor = lazy(() => import('./componentes/Editor').then((m) => ({ default: m.Editor })))

type Vista = 'galeria' | 'editor' | 'reglas'

interface EstadoInicial {
  vista: Vista
  id: string
  nombreArchivo: string
  texto: string
}

/** Permite abrir un diagrama por enlace directo: #organigrama-el-roble */
function estadoInicial(): EstadoInicial | null {
  if (typeof location === 'undefined') return null
  const id = location.hash.replace(/^#\/?/, '')
  if (!id) return null
  if (id === 'reglas') {
    return { vista: 'reglas', id: 'nuevo', nombreArchivo: 'organigrama.yaml', texto: '' }
  }
  const ejemplo = EJEMPLOS.find((e) => e.id === id)
  if (!ejemplo) return null
  return {
    vista: 'editor',
    id: ejemplo.id,
    nombreArchivo: ejemplo.archivo,
    texto: localStorage.getItem(`syo:borrador:${ejemplo.id}`) ?? ejemplo.texto,
  }
}

export function App() {
  const [inicial] = useState(estadoInicial)
  const [vista, setVista] = useState<Vista>(inicial?.vista ?? 'galeria')
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('syo:oscuro') === '1')
  const [id, setId] = useState(inicial?.id ?? 'nuevo')
  const [nombreArchivo, setNombreArchivo] = useState(inicial?.nombreArchivo ?? 'organigrama.yaml')
  const [texto, setTexto] = useState(inicial?.texto ?? '')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
    localStorage.setItem('syo:oscuro', oscuro ? '1' : '0')
  }, [oscuro])

  // Autoguardado del borrador en el navegador.
  useEffect(() => {
    if (!texto) return
    const t = setTimeout(() => localStorage.setItem(`syo:borrador:${id}`, texto), 400)
    return () => clearTimeout(t)
  }, [texto, id])

  const original = useMemo(() => EJEMPLOS.find((e) => e.id === id)?.texto, [id])

  function abrir(idEjemplo: string): void {
    const ejemplo = EJEMPLOS.find((e) => e.id === idEjemplo)
    if (!ejemplo) return
    const borrador = localStorage.getItem(`syo:borrador:${idEjemplo}`)
    setId(idEjemplo)
    setNombreArchivo(ejemplo.archivo)
    setTexto(borrador ?? ejemplo.texto)
    setVista('editor')
    // Enlace directo: #organigrama-el-roble
    if (location.hash !== `#${idEjemplo}`) {
      history.replaceState(null, '', `#${idEjemplo}`)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
              <rect x="9" y="2" width="14" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 10v6M5 16h22M5 16v4M27 16v4M16 16v4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="1" y="20" width="8" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="12" y="20" width="8" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="23" y="20" width="8" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <div>
              <h1 className="text-base font-semibold leading-tight">SyO · Organigramas y DFD</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                UNNOBA · reglas de la cátedra · exportable a SVG, PNG y PDF
              </p>
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVista('galeria')}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                vista === 'galeria'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Galería
            </button>
            <button
              type="button"
              onClick={() => setVista(vista === 'editor' ? 'galeria' : 'editor')}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                vista === 'editor'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setVista('reglas')}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                vista === 'reglas'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Reglas
            </button>
            <button
              type="button"
              onClick={() => setOscuro((v) => !v)}
              title={oscuro ? 'Tema claro' : 'Tema oscuro'}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              {oscuro ? '☀' : '☾'}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4">
        {vista === 'galeria' && <Galeria ejemplos={EJEMPLOS} onAbrir={abrir} />}

        {vista === 'editor' &&
          (texto ? (
            <Suspense
              fallback={
                <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Cargando editor…
                </p>
              }
            >
              <Editor
                texto={texto}
                onChangeTexto={setTexto}
                id={id}
                nombreArchivo={nombreArchivo}
                onCambiarNombre={setNombreArchivo}
                onVolver={() => setVista('galeria')}
                oscuro={oscuro}
                original={original}
                onNuevo={(nuevoTexto, nuevoId, nuevoNombre) => {
                  setId(nuevoId)
                  setTexto(nuevoTexto)
                  setNombreArchivo(nuevoNombre)
                }}
              />
            </Suspense>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Abrí un diagrama desde la galería o creá uno nuevo desde el editor.
            </p>
          ))}

        {vista === 'reglas' && <Reglas />}
      </main>

      <footer className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-400 dark:border-slate-700">
        Hecho para estudiar SyO (UNNOBA) · el contenido vive en <code className="font-mono">diagramas/*.yaml</code> ·
        los agentes pueden usar <code className="font-mono">pnpm validar</code> y{' '}
        <code className="font-mono">pnpm render</code>
      </footer>
    </div>
  )
}
