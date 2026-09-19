import { forwardRef, useMemo } from 'react'

interface Props {
  svg: string | null
  resaltados: string[]
}

function conResaltado(svg: string, ids: string[]): string {
  let salida = svg
  for (const id of ids) {
    if (!id) continue
    const patron = `data-nodo="${id}"`
    salida = salida.split(patron).join(`${patron} class="nodo-resaltado"`)
  }
  return salida
}

/** Vista previa del SVG generado, con resaltado de nodos señalados. */
export const VistaPrevia = forwardRef<HTMLDivElement, Props>(function VistaPrevia(
  { svg, resaltados },
  ref,
) {
  const html = useMemo(() => (svg ? conResaltado(svg, resaltados) : null), [svg, resaltados])

  if (!html) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Corregí los errores de estructura para ver la vista previa.
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="lienzo h-full overflow-auto rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700"
      // El SVG se genera localmente a partir del YAML del usuario.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})
