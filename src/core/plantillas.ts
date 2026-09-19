/** Plantillas de arranque, compartidas por el CLI y la app. */

export function plantillaOrganigrama(titulo = 'Nuevo organigrama'): string {
  return `tipo: organigrama
titulo: ${titulo}
disposicion: vertical
esSA: false
unidades:
  - id: raiz
    nombre: Gerencia General
  - id: area
    nombre: Área
    padre: raiz
`
}

export function plantillaDfd(titulo = 'Nuevo DFD'): string {
  return `tipo: dfd
titulo: ${titulo}
nivel: 1
nodos:
  - id: entidad
    tipo: entidad
    nombre: Entidad Externa
  - id: p1
    tipo: proceso
    numero: "1"
    nombre: Proceso 1
  - id: a1
    tipo: almacen
    nombre: Almacén
flujos:
  - de: entidad
    a: p1
    etiqueta: Entrada
  - de: p1
    a: a1
    etiqueta: Registro
`
}
