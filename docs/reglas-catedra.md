# Reglas de la cátedra SyO

> Generado automáticamente desde `src/core/reglas/catalogo.ts` (`pnpm reglas --markdown`). No editar a mano.

## Organigrama

### ORG-01 — Ids únicos *(error)*

Cada unidad orgánica debe tener un id distinto para poder referenciarla sin ambigüedad.

Referencia: Regla de modelado

### ORG-02 — Referencias existentes *(error)*

Los campos padre, funcionalA y asesoraA deben apuntar a unidades que existan. Una unidad no puede depender de sí misma.

Referencia: Regla de modelado

### ORG-03 — Raíz única *(error)*

La estructura formal tiene una sola cabeza (por ejemplo: AGA → Directorio → Gerencia General). Debe existir exactamente una unidad sin dependencia jerárquica.

Referencia: U3 — Organigrama: niveles jerárquicos

### ORG-04 — Sin ciclos de dependencia *(error)*

La dependencia jerárquica no puede volver sobre sí misma (A depende de B y B de A).

Referencia: U3 — Cadena de mando

### ORG-05 — Sin entegramas aislados *(error)*

No puede haber entegramas aislados: toda unidad debe colgar de la raíz por una línea de autoridad.

Referencia: U3 — Reglas para graficar: "No puede haber entegramas aislados"

### ORG-06 — Staff correctamente definido *(error)*

Una unidad de staff (asesoría) necesita indicar a quién asesora (asesoraA) y no se conecta por línea de autoridad.

Referencia: U3 — Línea de asistencia técnica o staff

### ORG-07 — Staff fuera de la jerarquía *(advertencia)*

El staff asesora pero no manda: no debe tener padre jerárquico ni unidades a cargo. Se grafica con línea punteada al costado del entegrama que asesora.

Referencia: U3 — Línea de asistencia técnica o staff

### ORG-08 — S.A.: AGA y Directorio obligatorios *(error)*

Siempre que la organización sea una S.A. deben graficarse la Asamblea General de Accionistas (AGA) y el Directorio.

Referencia: U3 — Reglas para graficar

### ORG-09 — S.A. detectada en el título *(advertencia)*

El título parece indicar una Sociedad Anónima. Activá esSA para que se exijan AGA y Directorio.

Referencia: U3 — Reglas para graficar

### ORG-10 — Secretarias personales no se grafican *(advertencia)*

Las secretarias (asistentes) no se grafican; las Secretarías como unidad orgánica sí. Revisá si ese entegrama es una persona o un área.

Referencia: U3 — Reglas para graficar

### ORG-11 — Unidades duplicadas *(advertencia)*

Hay dos unidades con el mismo nombre: puede tratarse de una duplicación involuntaria.

Referencia: Regla de modelado

## DFD

### DFD-01 — Nivel 0: un solo proceso y sin almacenes *(error)*

El diagrama de contexto muestra un único proceso (el sistema) y sus entidades externas. Los almacenes recién aparecen en el nivel 1.

Referencia: U4 — Niveles de los DFD

### DFD-02 — Todo proceso tiene entrada y salida *(error)*

Un proceso transforma datos: debe tener al menos un flujo de entrada y uno de salida. No es origen ni final de los datos.

Referencia: U4 — Proceso

### DFD-03 — Proceso entre entidad externa y almacén *(error)*

Entre una entidad externa y un almacén siempre debe existir un proceso: ni la entidad ni el almacén transforman datos.

Referencia: U4 — Proceso / Almacén

### DFD-04 — Almacén no se conecta con almacén *(error)*

Un almacén no puede estar comunicado directamente con otro almacén.

Referencia: U4 — Almacén

### DFD-05 — Sin flujos entre entidades externas *(error)*

La comunicación entre entidades externas no se contempla en el diagrama por estar fuera del ámbito del sistema.

Referencia: U4 — Entidad externa

### DFD-06 — Sin flujos entre procesos en nivel 1 *(error)*

En el nivel 1 los procesos se comunican a través de almacenes. Los flujos directos entre procesos se permiten desde el nivel 2 en adelante.

Referencia: U4 — Niveles de los DFD

### DFD-07 — Flujos bien referenciados *(error)*

Cada flujo debe conectar dos nodos existentes y no puede salir y llegar al mismo nodo.

Referencia: U4 — Flujo de datos

### DFD-08 — Ids únicos de nodos *(error)*

Cada nodo del DFD debe tener un id distinto.

Referencia: Regla de modelado

### DFD-09 — Numeración de procesos *(advertencia)*

Los procesos se numeran 1, 2, 3… en el nivel 1 y 1.1, 1.2… al explotar un proceso. En nivel 2+ conviene indicar procesoPadre.

Referencia: U4 — Niveles de los DFD

### DFD-10 — Flujos sin nombre *(advertencia)*

El flujo no lleva nombre cuando incide sobre el contenido completo de un almacén (lectura/escritura total). Fuera de ese caso, conviene nombrarlo.

Referencia: U4 — Almacén

### DFD-11 — Almacén sin flujos *(advertencia)*

Un almacén sin ningún flujo de entrada o salida no cumple ninguna función en el diagrama.

Referencia: U4 — Almacén

### DFD-12 — Nombres duplicados *(advertencia)*

Hay procesos o almacenes con el mismo nombre. Las entidades externas sí pueden repetirse para evitar cruces de líneas.

Referencia: U4 — Entidad externa

### DFD-13 — Flujos duplicados *(advertencia)*

Hay dos flujos idénticos (mismo origen, destino y etiqueta).

Referencia: Regla de modelado

### DFD-14 — Conservación de datos *(info)*

Los datos que entran a un proceso deben ser suficientes para producir los datos de salida. No es verificable automáticamente: revisalo manualmente.

Referencia: U4 — Reglas complementarias

### DFD-15 — No se modela hardware *(info)*

El DFD modela flujos de datos lógicos, no componentes físicos (p. ej. el lector de tarjetas SUBI no es una entidad externa).

Referencia: U4 — Práctica SUBI

## General

### GEN-01 — No se mezclan formas de graficar *(info)*

Un diagrama usa una sola disposición (vertical, horizontal, circular o semicircular). El formato lo garantiza: la disposición es un campo único.

Referencia: U3 — Reglas para graficar

### GEN-02 — Mismo nivel, misma altura *(info)*

Las unidades del mismo nivel jerárquico se dibujan a la misma altura. Lo garantiza el motor de layout.

Referencia: U3 — Reglas para graficar

### GEN-03 — Línea de autoridad vs. especialización vs. staff *(info)*

Línea llena = autoridad; línea punteada = dependencia funcional (especialización); línea de staff = asesoramiento, unida al costado del entegrama.

Referencia: U3 — Elementos del organigrama

