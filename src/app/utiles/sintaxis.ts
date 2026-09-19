/**
 * Hoja de sintaxis del YAML de la herramienta.
 *
 * Ojo: describe el *formato del archivo* (campos, tipos, ejemplos). No incluye
 * las reglas de la cátedra a propósito: el modo examen es un graficador y no
 * debe funcionar como ayudín de la materia.
 */

export const EJEMPLO_ORGANIGRAMA = `tipo: organigrama
titulo: Mi Empresa S.A.
disposicion: vertical   # vertical | horizontal | circular | semicircular
esSA: true              # S.A.: grafica AGA y Directorio
mostrarNiveles: false   # guías de nivel (vertical/horizontal)
unidades:
  - id: gg
    nombre: Gerencia General
  - id: directorio
    nombre: Directorio
    padre: gg
  - id: ventas
    nombre: Departamento de Ventas
    padre: directorio
  - id: asesoria
    nombre: Asesoría Legal
    vinculo: staff      # asesoramiento (borde punteado)
    asesoraA: gg        # a quién asesora
    lado: izq           # izq | der
  - id: compras
    nombre: Departamento de Compras
    padre: directorio
    funcionalA: gg      # dependencia funcional (punteada)
    orden: 2            # orden entre hermanos`

export const EJEMPLO_DFD = `tipo: dfd
titulo: Sistema de ventas
nivel: 1                # número de nivel: 0, 1, 2…
procesoPadre: "1"       # solo para niveles de detalle
nodos:
  - id: cliente
    tipo: entidad
    nombre: Cliente
  - id: p1
    tipo: proceso
    numero: "1"         # los números van entre comillas
    nombre: Registrar pedido
  - id: pedidos
    tipo: almacen
    nombre: Pedidos
    detalle: fecha, cliente, total
flujos:
  - de: cliente
    a: p1
    etiqueta: Pedido
  - de: p1
    a: pedidos
    etiqueta: Guarda pedido`

export interface Campo {
  campo: string
  descripcion: string
}

export const CAMPOS_ORGANIGRAMA: Campo[] = [
  { campo: 'tipo', descripcion: 'siempre `organigrama`' },
  { campo: 'titulo', descripcion: 'texto que se muestra arriba del dibujo' },
  { campo: 'disposicion', descripcion: 'vertical | horizontal | circular | semicircular' },
  { campo: 'esSA', descripcion: 'true/false; indica que la organización es una S.A.' },
  { campo: 'mostrarNiveles', descripcion: 'true/false; dibuja las guías de nivel' },
  { campo: 'unidades[]', descripcion: 'lista de entegramas (ver abajo)' },
]

export const CAMPOS_UNIDAD: Campo[] = [
  { campo: 'id', descripcion: 'nombre corto único (letras, números, guion)' },
  { campo: 'nombre', descripcion: 'texto del entegrama; se corta solo en líneas' },
  { campo: 'padre', descripcion: 'id de la unidad de la que depende (línea llena)' },
  { campo: 'vinculo', descripcion: '`autoridad` (por defecto) o `staff`' },
  { campo: 'asesoraA', descripcion: 'solo staff: id de la unidad a la que asesora' },
  { campo: 'lado', descripcion: 'solo staff: `izq` o `der`' },
  { campo: 'funcionalA', descripcion: 'id de la unidad de la que depende funcionalmente' },
  { campo: 'orden', descripcion: 'número para ordenar entre hermanos' },
]

export const CAMPOS_DFD_NODO: Campo[] = [
  { campo: 'id', descripcion: 'nombre corto único' },
  { campo: 'tipo', descripcion: 'entidad | proceso | almacen' },
  { campo: 'nombre', descripcion: 'texto del símbolo' },
  { campo: 'numero', descripcion: 'solo procesos: "1", "2", "1.1"… (entre comillas)' },
  { campo: 'detalle', descripcion: 'texto chico debajo del nombre (ej. campos del almacén)' },
]

export const CAMPOS_DFD_FLUJO: Campo[] = [
  { campo: 'de', descripcion: 'id del nodo de origen' },
  { campo: 'a', descripcion: 'id del nodo de destino' },
  { campo: 'etiqueta', descripcion: 'nombre del flujo (opcional)' },
]

export const CONSEJOS: string[] = [
  'Los `id` son las referencias: se usan en `padre`, `asesoraA`, `funcionalA`, `de` y `a`.',
  'Cuidado con los dos puntos: `nota: Texto: con dos puntos` rompe el YAML. Usá `nota: >-` en varias líneas o comillas.',
  'Los números de proceso van entre comillas: `numero: "1"`.',
  'La indentación es con espacios (2 por nivel); no mezcles tabulaciones.',
  'Si algo no se entiende, arriba del editor aparecen los errores de estructura con el detalle.',
  'La app guarda un borrador en el navegador: si recargás, tu trabajo sigue ahí.',
]
