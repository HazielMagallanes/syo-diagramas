/** Exportación de diagramas desde el navegador: SVG, PNG y PDF. */

function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function descargarTexto(texto: string, nombre: string, tipo = 'text/plain'): void {
  descargarBlob(new Blob([texto], { type: `${tipo};charset=utf-8` }), nombre)
}

export function descargarSvg(svg: string, nombre: string): void {
  descargarBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), nombre)
}

export async function descargarPng(svg: string, nombre: string, escala = 2): Promise<void> {
  const ancho = Number(svg.match(/width="([\d.]+)"/)?.[1] ?? 800)
  const alto = Number(svg.match(/height="([\d.]+)"/)?.[1] ?? 600)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const imagen = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const img = new Image()
      img.onload = () => resolver(img)
      img.onerror = () => rechazar(new Error('No se pudo rasterizar el SVG'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(ancho * escala)
    canvas.height = Math.ceil(alto * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Sin contexto 2D')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/png'))
    if (blob) descargarBlob(blob, nombre)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function descargarPdf(elementoSvg: SVGSVGElement, nombre: string): Promise<void> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  const ancho = Number(elementoSvg.getAttribute('width') ?? 800)
  const alto = Number(elementoSvg.getAttribute('height') ?? 600)
  const horizontal = ancho >= alto
  const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const paginaAncho = doc.internal.pageSize.getWidth()
  const paginaAlto = doc.internal.pageSize.getHeight()
  const margen = 24
  const escala = Math.min((paginaAncho - margen * 2) / ancho, (paginaAlto - margen * 2) / alto)
  const w = ancho * escala
  const h = alto * escala
  await svg2pdf(elementoSvg, doc, {
    x: (paginaAncho - w) / 2,
    y: (paginaAlto - h) / 2,
    width: w,
    height: h,
  })
  doc.save(nombre)
}
