# Instrucciones para agentes (AGENTS.md)

Este repositorio es una herramienta **diagramas-como-código**: los organigramas y DFD
viven como archivos YAML en `diagramas/`, se validan contra las reglas de la cátedra
SyO (UNNOBA) y se renderizan a SVG/PNG/PDF.

## Reglas de oro

1. **No inventes estructura**: un organigrama tiene una sola raíz; un DFD de nivel 0
   tiene un solo proceso y ningún almacén.
2. **Validá siempre** después de editar: `pnpm validar` (agrega `--json` si necesitás
   parsear la salida). No hay que renderizar para saber si está bien.
3. **Los ejemplos son tests**: `pnpm test` verifica que todos los `diagramas/*.yaml`
   parseen, cumplan las reglas y rendericen. Si tocás un ejemplo, corré `pnpm test`.
4. **Documentá la fuente**: cuando un diagrama resuelve un ejercicio de la cátedra,
   agregá en `nota:` de dónde sale (unidad, enunciado) y las decisiones tomadas.
5. **No borres `nota:`** ni reorganices campos sin motivo: el YAML se lee a mano.

## Flujo de trabajo

```bash
pnpm nuevo organigrama mafalda-2026 --titulo "Mafalda S.A."   # crear plantilla
pnpm validar                                                   # validar todo
pnpm validar diagramas/mi-diagrama.yaml --json                 # salida para parsear
pnpm render diagramas/mi-diagrama.yaml --salida salida/        # SVG sin navegador
pnpm test                                                      # tests + ejemplos
```

Después: commit + push. GitHub Actions corre `typecheck`, `test`, `validar` y `build`;
si algo falla, no se publica.

## Esquema y reglas

- Esquema completo: [`docs/esquema.md`](docs/esquema.md).
- Reglas de la cátedra (id, severidad, referencia): [`docs/reglas-catedra.md`](docs/reglas-catedra.md).
- Catálogo programático: `src/core/reglas/catalogo.ts` (fuente de verdad; el `.md` se
  regenera con `pnpm reglas --markdown`).

## Errores típicos que la validación detecta

| Regla | Error a evitar |
|---|---|
| ORG-03/05 | Dos raíces o unidades que no cuelgan de la raíz |
| ORG-06/07 | Staff con `padre`, sin `asesoraA` o con unidades a cargo |
| ORG-08 | Organización S.A. sin AGA ni Directorio |
| DFD-01 | Nivel 0 con más de un proceso o con almacenes |
| DFD-02 | Procesos sin entrada o sin salida |
| DFD-03 | Almacén conectado directo a una entidad externa |
| DFD-06 | Flujos entre procesos en nivel 1 (van por almacenes) |
| DFD-09 | Procesos sin número o con formato incorrecto (`1.1` en nivel 1) |

## Extensiones del motor

- `src/core/layout/organigrama.ts`: layout de las 4 disposiciones + resolución de
  colisiones de asesores.
- `src/core/render/`: generación de SVG (símbolos de la cátedra).
- `src/core/reglas/`: validadores; para agregar una regla: creala en el catálogo con un
  id nuevo, implementala en el validador correspondiente y sumá un test en `src/test/`.

## Estilo del repositorio

- Español en documentación, comentarios y UI.
- TypeScript estricto (`pnpm typecheck`), tests con vitest.
- pnpm con `minimumReleaseAge` (7 días) en `pnpm-workspace.yaml`: no lo desactives.
- Commits convencionales (`feat:`, `fix:`, `docs:`…).
