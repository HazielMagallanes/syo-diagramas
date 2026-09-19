# Esquema de los diagramas

Los diagramas se escriben en **YAML** (o JSON: YAML es un superconjunto) dentro de `diagramas/`.
Un archivo = un diagrama, identificado por el nombre del archivo (`organigrama-el-roble.yaml` → `organigrama-el-roble`).

Todos los campos marcados con `?` son opcionales.

---

## Organigrama

```yaml
tipo: organigrama            # obligatorio
titulo: Materiales "El Roble S.A."
disposicion: vertical        # vertical | horizontal | circular | semicircular
esSA: true                   # si es true, exige AGA y Directorio (regla ORG-08)
mostrarNiveles: false        # dibuja separadores y etiquetas de nivel
nota: >-                     # texto libre, no se dibuja
  Aclaraciones para quien lea el archivo.
unidades:
  - id: aga                  # obligatorio: [A-Za-z0-9_-]
    nombre: Asamblea General de Accionistas
  - id: directorio
    nombre: Directorio
    padre: aga               # línea de autoridad (llena)
  - id: gg
    nombre: Gerencia General
    padre: directorio
  - id: asesoria
    nombre: Consultoría Jurídica
    vinculo: staff           # asesoramiento: línea punteada al costado
    asesoraA: gg             # a quién asesora (obligatorio si vinculo: staff)
    lado: izq                # izq | der: de qué lado del entegrama se dibuja
  - id: compras
    nombre: Departamento de Compras
    padre: gg
    funcionalA: directorio   # línea punteada de dependencia funcional
    orden: 2                 # orden entre hermanos (menor primero)
```

### Reglas del modelo

| Campo | Significado | Regla |
|---|---|---|
| `padre` | Dependencia jerárquica (línea llena) | Debe existir una sola raíz sin `padre` |
| `funcionalA` | Dependencia funcional/especialización (línea punteada) | No reemplaza a `padre` |
| `vinculo: staff` + `asesoraA` | Asesoramiento | El staff no manda: no lleva `padre` ni unidades a cargo |
| `lado` | Lado del entegrama al que se dibuja el asesor | Solo para `vinculo: staff` |
| `orden` | Orden entre hermanos | Opcional; por defecto, orden de declaración |

### Disposiciones

- `vertical`: pirámide clásica, niveles de arriba hacia abajo.
- `horizontal`: la jerarquía avanza de izquierda a derecha.
- `circular`: la raíz al centro y anillos concéntricos por nivel.
- `semicircular`: como la circular, pero sobre media circunferencia.

En todas: mismo nivel → misma altura (o mismo radio), garantizado por el motor de layout.

---

## DFD (Diagrama de Flujo de Datos)

```yaml
tipo: dfd                    # obligatorio
titulo: Sistema SUBI — Secretaría de Transporte
nivel: 1                     # 0 = contexto, 1 = superior, 2+ = detalle
procesoPadre: "1"            # en nivel 2+: número del proceso que se explota
nota: >-
  Aclaraciones.
nodos:
  - id: pasajero
    tipo: entidad            # entidad | proceso | almacen
    nombre: Pasajero
  - id: p1
    tipo: proceso
    numero: "1"              # 1, 2… (nivel 1) o 1.1, 1.2… (nivel 2+)
    nombre: Procesar pago de viaje
  - id: viajes
    tipo: almacen
    nombre: Viajes
    detalle: nro. tarjeta, tipo de transporte, fecha y hora
flujos:
  - de: pasajero
    a: p1
    etiqueta: Pago de viaje
  - de: p1
    a: viajes
    etiqueta: Registra detalle del viaje
```

### Reglas del modelo

| Nivel | Qué muestra |
|---|---|
| `0` | **Un solo** proceso (el sistema) y sus entidades externas. **Sin almacenes** |
| `1` | Procesos numerados; aparecen los almacenes. **Sin flujos entre procesos** |
| `2+` | Detalle/expansión; se permiten flujos entre procesos |

- Un **proceso** transforma datos: necesita al menos una entrada y una salida.
- Entre una **entidad externa** y un **almacén** siempre debe haber un proceso.
- Un almacén no se conecta con otro almacén ni con una entidad externa.
- Los flujos entre entidades externas no se modelan.
- El flujo no lleva nombre cuando lee/escribe el almacén completo; en el resto de los casos, se nombra.
- El DFD modela flujos de datos lógicos, no hardware (por ejemplo, el lector SUBI no es una entidad externa).

Las 16 reglas de DFD y las 11 de organigrama están detalladas en [`reglas-catedra.md`](reglas-catedra.md).

---

## Errores frecuentes

- `nota: Texto con dos puntos: y más` → YAML se rompe. Usá `nota: >-` en varias líneas.
- Un asesor con `padre:` → error conceptual (el staff no está en la línea de mando).
- Un DFD de nivel 1 con `p1 → p2` → prohibido: la comunicación va por almacenes.
- Diagrama sin `disposicion` (organigrama) o sin `nivel` (DFD).
- En YAML, los números de proceso van entre comillas: `numero: "1"` (si no, se leen como número y la validación de formato no aplica).

## Comandos útiles

```bash
pnpm validar                                   # valida todo diagramas/
pnpm validar diagramas/dfd-subi-n1.yaml --json # salida para agentes
pnpm render diagramas/organigrama-dyh.yaml     # genera salida/organigrama-dyh.svg
pnpm nuevo organigrama mi-empresa --titulo "Mi Empresa S.A."
pnpm reglas --markdown                         # regenera docs/reglas-catedra.md
```
