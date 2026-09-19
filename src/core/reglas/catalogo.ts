import type { Regla } from '../tipos'

/**
 * Catálogo de reglas de la cátedra SyO (UNNOBA).
 * Cada regla tiene id estable, severidad y referencia a las diapositivas.
 * Es la fuente de verdad que usan los validadores, la app y la documentación.
 */
export const REGLAS: Regla[] = [
  // ─── Organigramas ────────────────────────────────────────────────────────
  {
    id: 'ORG-01',
    categoria: 'Organigrama',
    titulo: 'Ids únicos',
    descripcion: 'Cada unidad orgánica debe tener un id distinto para poder referenciarla sin ambigüedad.',
    severidad: 'error',
    referencia: 'Regla de modelado',
  },
  {
    id: 'ORG-02',
    categoria: 'Organigrama',
    titulo: 'Referencias existentes',
    descripcion:
      'Los campos padre, funcionalA y asesoraA deben apuntar a unidades que existan. Una unidad no puede depender de sí misma.',
    severidad: 'error',
    referencia: 'Regla de modelado',
  },
  {
    id: 'ORG-03',
    categoria: 'Organigrama',
    titulo: 'Raíz única',
    descripcion:
      'La estructura formal tiene una sola cabeza (por ejemplo: AGA → Directorio → Gerencia General). Debe existir exactamente una unidad sin dependencia jerárquica.',
    severidad: 'error',
    referencia: 'U3 — Organigrama: niveles jerárquicos',
  },
  {
    id: 'ORG-04',
    categoria: 'Organigrama',
    titulo: 'Sin ciclos de dependencia',
    descripcion: 'La dependencia jerárquica no puede volver sobre sí misma (A depende de B y B de A).',
    severidad: 'error',
    referencia: 'U3 — Cadena de mando',
  },
  {
    id: 'ORG-05',
    categoria: 'Organigrama',
    titulo: 'Sin entegramas aislados',
    descripcion:
      'No puede haber entegramas aislados: toda unidad debe colgar de la raíz por una línea de autoridad.',
    severidad: 'error',
    referencia: 'U3 — Reglas para graficar: "No puede haber entegramas aislados"',
  },
  {
    id: 'ORG-06',
    categoria: 'Organigrama',
    titulo: 'Staff correctamente definido',
    descripcion:
      'Una unidad de staff (asesoría) necesita indicar a quién asesora (asesoraA) y no se conecta por línea de autoridad.',
    severidad: 'error',
    referencia: 'U3 — Línea de asistencia técnica o staff',
  },
  {
    id: 'ORG-07',
    categoria: 'Organigrama',
    titulo: 'Staff fuera de la jerarquía',
    descripcion:
      'El staff asesora pero no manda: no debe tener padre jerárquico ni unidades a cargo. Se grafica con línea punteada al costado del entegrama que asesora.',
    severidad: 'advertencia',
    referencia: 'U3 — Línea de asistencia técnica o staff',
  },
  {
    id: 'ORG-08',
    categoria: 'Organigrama',
    titulo: 'S.A.: AGA y Directorio obligatorios',
    descripcion:
      'Siempre que la organización sea una S.A. deben graficarse la Asamblea General de Accionistas (AGA) y el Directorio.',
    severidad: 'error',
    referencia: 'U3 — Reglas para graficar',
  },
  {
    id: 'ORG-09',
    categoria: 'Organigrama',
    titulo: 'S.A. detectada en el título',
    descripcion:
      'El título parece indicar una Sociedad Anónima. Activá esSA para que se exijan AGA y Directorio.',
    severidad: 'advertencia',
    referencia: 'U3 — Reglas para graficar',
  },
  {
    id: 'ORG-10',
    categoria: 'Organigrama',
    titulo: 'Secretarias personales no se grafican',
    descripcion:
      'Las secretarias (asistentes) no se grafican; las Secretarías como unidad orgánica sí. Revisá si ese entegrama es una persona o un área.',
    severidad: 'advertencia',
    referencia: 'U3 — Reglas para graficar',
  },
  {
    id: 'ORG-11',
    categoria: 'Organigrama',
    titulo: 'Unidades duplicadas',
    descripcion: 'Hay dos unidades con el mismo nombre: puede tratarse de una duplicación involuntaria.',
    severidad: 'advertencia',
    referencia: 'Regla de modelado',
  },

  // ─── DFD ─────────────────────────────────────────────────────────────────
  {
    id: 'DFD-01',
    categoria: 'DFD',
    titulo: 'Nivel 0: un solo proceso y sin almacenes',
    descripcion:
      'El diagrama de contexto muestra un único proceso (el sistema) y sus entidades externas. Los almacenes recién aparecen en el nivel 1.',
    severidad: 'error',
    referencia: 'U4 — Niveles de los DFD',
  },
  {
    id: 'DFD-02',
    categoria: 'DFD',
    titulo: 'Todo proceso tiene entrada y salida',
    descripcion:
      'Un proceso transforma datos: debe tener al menos un flujo de entrada y uno de salida. No es origen ni final de los datos.',
    severidad: 'error',
    referencia: 'U4 — Proceso',
  },
  {
    id: 'DFD-03',
    categoria: 'DFD',
    titulo: 'Proceso entre entidad externa y almacén',
    descripcion:
      'Entre una entidad externa y un almacén siempre debe existir un proceso: ni la entidad ni el almacén transforman datos.',
    severidad: 'error',
    referencia: 'U4 — Proceso / Almacén',
  },
  {
    id: 'DFD-04',
    categoria: 'DFD',
    titulo: 'Almacén no se conecta con almacén',
    descripcion: 'Un almacén no puede estar comunicado directamente con otro almacén.',
    severidad: 'error',
    referencia: 'U4 — Almacén',
  },
  {
    id: 'DFD-05',
    categoria: 'DFD',
    titulo: 'Sin flujos entre entidades externas',
    descripcion:
      'La comunicación entre entidades externas no se contempla en el diagrama por estar fuera del ámbito del sistema.',
    severidad: 'error',
    referencia: 'U4 — Entidad externa',
  },
  {
    id: 'DFD-06',
    categoria: 'DFD',
    titulo: 'Sin flujos entre procesos en nivel 1',
    descripcion:
      'En el nivel 1 los procesos se comunican a través de almacenes. Los flujos directos entre procesos se permiten desde el nivel 2 en adelante.',
    severidad: 'error',
    referencia: 'U4 — Niveles de los DFD',
  },
  {
    id: 'DFD-07',
    categoria: 'DFD',
    titulo: 'Flujos bien referenciados',
    descripcion: 'Cada flujo debe conectar dos nodos existentes y no puede salir y llegar al mismo nodo.',
    severidad: 'error',
    referencia: 'U4 — Flujo de datos',
  },
  {
    id: 'DFD-08',
    categoria: 'DFD',
    titulo: 'Ids únicos de nodos',
    descripcion: 'Cada nodo del DFD debe tener un id distinto.',
    severidad: 'error',
    referencia: 'Regla de modelado',
  },
  {
    id: 'DFD-09',
    categoria: 'DFD',
    titulo: 'Numeración de procesos',
    descripcion:
      'Los procesos se numeran 1, 2, 3… en el nivel 1 y 1.1, 1.2… al explotar un proceso. En nivel 2+ conviene indicar procesoPadre.',
    severidad: 'advertencia',
    referencia: 'U4 — Niveles de los DFD',
  },
  {
    id: 'DFD-10',
    categoria: 'DFD',
    titulo: 'Flujos sin nombre',
    descripcion:
      'El flujo no lleva nombre cuando incide sobre el contenido completo de un almacén (lectura/escritura total). Fuera de ese caso, conviene nombrarlo.',
    severidad: 'advertencia',
    referencia: 'U4 — Almacén',
  },
  {
    id: 'DFD-11',
    categoria: 'DFD',
    titulo: 'Almacén sin flujos',
    descripcion: 'Un almacén sin ningún flujo de entrada o salida no cumple ninguna función en el diagrama.',
    severidad: 'advertencia',
    referencia: 'U4 — Almacén',
  },
  {
    id: 'DFD-12',
    categoria: 'DFD',
    titulo: 'Nombres duplicados',
    descripcion:
      'Hay procesos o almacenes con el mismo nombre. Las entidades externas sí pueden repetirse para evitar cruces de líneas.',
    severidad: 'advertencia',
    referencia: 'U4 — Entidad externa',
  },
  {
    id: 'DFD-13',
    categoria: 'DFD',
    titulo: 'Flujos duplicados',
    descripcion: 'Hay dos flujos idénticos (mismo origen, destino y etiqueta).',
    severidad: 'advertencia',
    referencia: 'Regla de modelado',
  },
  {
    id: 'DFD-14',
    categoria: 'DFD',
    titulo: 'Conservación de datos',
    descripcion:
      'Los datos que entran a un proceso deben ser suficientes para producir los datos de salida. No es verificable automáticamente: revisalo manualmente.',
    severidad: 'info',
    referencia: 'U4 — Reglas complementarias',
  },
  {
    id: 'DFD-15',
    categoria: 'DFD',
    titulo: 'No se modela hardware',
    descripcion:
      'El DFD modela flujos de datos lógicos, no componentes físicos (p. ej. el lector de tarjetas SUBI no es una entidad externa).',
    severidad: 'info',
    referencia: 'U4 — Práctica SUBI',
  },

  // ─── Generales ───────────────────────────────────────────────────────────
  {
    id: 'GEN-01',
    categoria: 'General',
    titulo: 'No se mezclan formas de graficar',
    descripcion:
      'Un diagrama usa una sola disposición (vertical, horizontal, circular o semicircular). El formato lo garantiza: la disposición es un campo único.',
    severidad: 'info',
    referencia: 'U3 — Reglas para graficar',
  },
  {
    id: 'GEN-02',
    categoria: 'General',
    titulo: 'Mismo nivel, misma altura',
    descripcion:
      'Las unidades del mismo nivel jerárquico se dibujan a la misma altura. Lo garantiza el motor de layout.',
    severidad: 'info',
    referencia: 'U3 — Reglas para graficar',
  },
  {
    id: 'GEN-03',
    categoria: 'General',
    titulo: 'Línea de autoridad vs. especialización vs. staff',
    descripcion:
      'Línea llena = autoridad; línea punteada = dependencia funcional (especialización); línea de staff = asesoramiento, unida al costado del entegrama.',
    severidad: 'info',
    referencia: 'U3 — Elementos del organigrama',
  },
]

const POR_ID = new Map(REGLAS.map((r) => [r.id, r]))

export function reglaPorId(id: string): Regla | undefined {
  return POR_ID.get(id)
}
