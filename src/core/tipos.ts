/**
 * Tipos del dominio: organigramas y DFD según la cátedra SyO (UNNOBA).
 * Este módulo no depende del navegador ni de Node: es la base compartida
 * entre la app web, el CLI y los tests.
 */

export type Disposicion = 'vertical' | 'horizontal' | 'circular' | 'semicircular'
export type Vinculo = 'autoridad' | 'staff'
export type Lado = 'izq' | 'der'
export type TipoNodoDfd = 'entidad' | 'proceso' | 'almacen'

/** Una unidad orgánica (entegrama) del organigrama. */
export interface Unidad {
  id: string
  nombre: string
  /** Id de la unidad de la que depende jerárquicamente (línea llena). */
  padre?: string
  /** Id de la unidad de la que depende funcionalmente (línea punteada). */
  funcionalA?: string
  /** `autoridad` (por defecto) o `staff` (asesoramiento, línea punteada al costado). */
  vinculo?: Vinculo
  /** Para `vinculo: staff`: id de la unidad a la que asesora. */
  asesoraA?: string
  /** Para `vinculo: staff`: de qué lado se dibuja la caja. */
  lado?: Lado
  /** Orden entre hermanos (menor primero). Por defecto, orden de declaración. */
  orden?: number
  nota?: string
}

export interface Organigrama {
  tipo: 'organigrama'
  titulo: string
  disposicion: Disposicion
  /** Si es una S.A.: obliga a graficar AGA y Directorio. */
  esSA?: boolean
  /** Dibuja separadores y etiquetas de nivel jerárquico (1, 2, 3...). */
  mostrarNiveles?: boolean
  unidades: Unidad[]
  nota?: string
}

export interface NodoDfd {
  id: string
  tipo: TipoNodoDfd
  nombre: string
  /** Número de proceso: 1, 2... (nivel 1) o 1.1, 1.2... (nivel 2+). */
  numero?: string
  /** Detalle extra, se muestra debajo del nombre (ej. campos del almacén). */
  detalle?: string
  nota?: string
}

export interface Flujo {
  de: string
  a: string
  /** Nombre del flujo de datos. Puede omitirse al leer/escribir un almacén completo. */
  etiqueta?: string
}

export interface Dfd {
  tipo: 'dfd'
  titulo: string
  /** 0 = contexto, 1 = superior, 2+ = detalle/expansión. */
  nivel: number
  /** Nombre del proceso que se está explotando (para nivel 2+). */
  procesoPadre?: string
  nodos: NodoDfd[]
  flujos: Flujo[]
  nota?: string
}

export type Diagrama = Organigrama | Dfd

export type Severidad = 'error' | 'advertencia' | 'info'

/** Resultado de aplicar una regla de la cátedra. */
export interface Hallazgo {
  reglaId: string
  severidad: Severidad
  mensaje: string
  /** Ids de nodos/unidades involucrados (para resaltarlos en la app). */
  nodos?: string[]
}

export interface Regla {
  id: string
  categoria: 'Organigrama' | 'DFD' | 'General'
  titulo: string
  descripcion: string
  severidad: Severidad
  referencia: string
}
