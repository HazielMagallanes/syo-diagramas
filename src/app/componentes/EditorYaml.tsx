import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { yaml } from '@codemirror/lang-yaml'
import { useEffect, useRef } from 'react'

interface Props {
  valor: string
  onChange: (valor: string) => void
  oscuro: boolean
}

/** Editor YAML con resaltado de sintaxis (CodeMirror 6). */
export function EditorYaml({ valor, onChange, oscuro }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const vista = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!contenedor.current) return
    const v = new EditorView({
      state: EditorState.create({
        doc: valor,
        extensions: [
          basicSetup,
          yaml(),
          ...(oscuro ? [oneDark] : []),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          }),
        ],
      }),
      parent: contenedor.current,
    })
    vista.current = v
    return () => {
      v.destroy()
      vista.current = null
    }
    // Se recrea solo cuando cambia el tema; el texto se sincroniza abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oscuro])

  useEffect(() => {
    const v = vista.current
    if (!v) return
    const actual = v.state.doc.toString()
    if (valor !== actual) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: valor } })
    }
  }, [valor])

  return <div ref={contenedor} className="h-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700" />
}
