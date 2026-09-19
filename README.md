# SyO · Organigramas y DFD

Editor web (100 % estático) para **armar, validar y exportar organigramas y Diagramas de Flujo de Datos (DFD)** aplicando las reglas de la cátedra *Sistemas y Organizaciones* (UNNOBA).

- **Reglas de la cátedra validadas automáticamente** (27 reglas: 11 de organigrama, 13 de DFD, 3 generales).
- **4 disposiciones** de organigrama: vertical, horizontal, circular y semicircular.
- **Exporta** SVG, PNG y PDF. **Edita** en YAML/JSON con vista previa en vivo.
- **Usable por agentes**: los diagramas son archivos de texto, con CLI (`pnpm validar`, `pnpm render`) y documentación del esquema.
- **Sin backend**: se publica en GitHub Pages.

## Inicio rápido

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Enlaces directos: `#organigrama-el-roble`, `#dfd-subi-n1`, `#reglas`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Chequeo de tipos + build estático en `dist/` |
| `pnpm test` | Tests (vitest): validadores, layout y ejemplos |
| `pnpm validar [archivos...] [--json]` | Valida las reglas de la cátedra (por defecto, `diagramas/`) |
| `pnpm render <archivo> [--salida dir] [--monocromo] [--sin-leyenda]` | Renderiza a SVG sin abrir el navegador |
| `pnpm reglas [--json\|--markdown]` | Lista las reglas de la cátedra |
| `pnpm nuevo <organigrama\|dfd> <slug> [--titulo "..."]` | Crea una plantilla en `diagramas/` |

## Estructura

```
src/core/            Motor compartido (app, CLI y tests)
  esquema.ts         Validación estructural (Zod)
  reglas/            Reglas de la cátedra + catálogo con referencias
  layout/            Layout de organigramas (flextree) y DFD (dagre)
  render/            SVG propio (entegramas, óvalos, almacenes de dos líneas)
src/app/             Interfaz React + Vite + Tailwind
src/cli/             CLI para agentes y CI
diagramas/           Los diagramas (fuente de verdad, YAML)
docs/                Esquema y reglas de la cátedra
```

## Cómo colaborar (humanos y agentes)

1. Escribí o editá un `.yaml` en `diagramas/` (mirá `docs/esquema.md`).
2. Corré `pnpm validar` y corregí lo que marque.
3. `pnpm test` valida además que todos los ejemplos rendericen.
4. Hacé commit y push: GitHub Actions valida y publica en Pages.

Los agentes deben leer [`AGENTS.md`](AGENTS.md) antes de tocar diagramas.

## Deploy

Cada push a `main` ejecuta tests, validación y build, y publica en GitHub Pages
(`.github/workflows/deploy.yml`). En el repositorio hay que habilitar
*Settings → Pages → Source: GitHub Actions* (una sola vez).

## Contexto

Material de estudio de la materia SyO (UNNOBA). Los ejemplos resueltos salen de las
diapositivas de la cátedra: organigramas (D&H, El Roble, Computer Service, Mafalda S.A.)
y DFD (venta de productos de limpieza, Perfumven y SUBI).
