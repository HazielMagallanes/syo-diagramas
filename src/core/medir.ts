/**
 * Medición de texto aproximada (sin DOM), para que el layout sea determinista
 * e idéntico en el navegador, en Node y en los tests.
 * Los anchos están en "em" y aproximan Helvetica/Arial.
 */

const ANCHOS_ESPECIALES: Record<string, number> = {
  i: 0.24, j: 0.24, l: 0.24,
  f: 0.33, t: 0.33, r: 0.36,
  m: 0.83, w: 0.72,
  I: 0.28,
  M: 0.83, W: 0.94,
  ' ': 0.28, '.': 0.28, ',': 0.28, ':': 0.28, ';': 0.28, '!': 0.28, '|': 0.26,
  '-': 0.33, '(': 0.33, ')': 0.33, '[': 0.28, ']': 0.28, '/': 0.28, '\\': 0.28,
  '&': 0.67, '@': 1, '%': 0.89,
  á: 0.52, é: 0.52, í: 0.28, ó: 0.52, ú: 0.52, ñ: 0.52, ü: 0.52,
  Á: 0.67, É: 0.67, Í: 0.28, Ó: 0.67, Ú: 0.67, Ñ: 0.72, Ü: 0.67,
}

function anchoCaracter(c: string): number {
  const especial = ANCHOS_ESPECIALES[c]
  if (especial !== undefined) return especial
  if (c >= '0' && c <= '9') return 0.556
  if (c >= 'A' && c <= 'Z') return 0.667
  if (c >= 'a' && c <= 'z') return 0.52
  return 0.5
}

/** Ancho estimado en píxeles de la línea más larga del texto. */
export function anchoTexto(texto: string, tamano = 13): number {
  let maximo = 0
  for (const linea of texto.split('\n')) {
    let ancho = 0
    for (const c of linea) ancho += anchoCaracter(c)
    maximo = Math.max(maximo, ancho)
  }
  return maximo * tamano
}

/** Envuelve el texto en líneas que no superen `anchoMax` píxeles. */
export function envolver(texto: string, anchoMax: number, tamano = 13): string[] {
  const lineas: string[] = []
  for (const parrafo of texto.split('\n')) {
    const palabras = parrafo.split(/\s+/).filter(Boolean)
    if (palabras.length === 0) {
      lineas.push('')
      continue
    }
    let actual = ''
    for (const palabra of palabras) {
      const candidata = actual ? `${actual} ${palabra}` : palabra
      if (anchoTexto(candidata, tamano) <= anchoMax || !actual) {
        actual = candidata
      } else {
        lineas.push(actual)
        actual = palabra
      }
    }
    if (actual) lineas.push(actual)
  }
  return lineas
}

/** Alto total de un bloque de `n` líneas. */
export function altoBloque(n: number, tamano = 13, interlineado = 1.25): number {
  return Math.max(n, 1) * tamano * interlineado
}
