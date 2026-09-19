import { z } from 'zod'

/**
 * Esquema de validación estructural (forma del archivo).
 * Las reglas de la cátedra se validan aparte, en src/core/reglas/.
 */

export const idSchema = z
  .string()
  .min(1, 'El id no puede estar vacío')
  .regex(/^[A-Za-z0-9_-]+$/, 'El id solo admite letras, números, guion y guion bajo')

export const unidadSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1, 'La unidad necesita un nombre'),
  padre: z.string().optional(),
  funcionalA: z.string().optional(),
  vinculo: z.enum(['autoridad', 'staff']).optional(),
  asesoraA: z.string().optional(),
  lado: z.enum(['izq', 'der']).optional(),
  orden: z.number().optional(),
  nota: z.string().optional(),
})

export const organigramaSchema = z.object({
  tipo: z.literal('organigrama'),
  titulo: z.string().min(1, 'El organigrama necesita un título'),
  disposicion: z.enum(['vertical', 'horizontal', 'circular', 'semicircular']),
  esSA: z.boolean().optional(),
  mostrarNiveles: z.boolean().optional(),
  unidades: z.array(unidadSchema).min(1, 'El organigrama necesita al menos una unidad'),
  nota: z.string().optional(),
})

export const nodoDfdSchema = z.object({
  id: idSchema,
  tipo: z.enum(['entidad', 'proceso', 'almacen']),
  nombre: z.string().min(1, 'El nodo necesita un nombre'),
  numero: z.string().optional(),
  detalle: z.string().optional(),
  nota: z.string().optional(),
})

export const flujoSchema = z.object({
  de: z.string().min(1),
  a: z.string().min(1),
  etiqueta: z.string().optional(),
})

export const dfdSchema = z.object({
  tipo: z.literal('dfd'),
  titulo: z.string().min(1, 'El DFD necesita un título'),
  nivel: z.number().int().min(0, 'El nivel no puede ser negativo'),
  procesoPadre: z.string().optional(),
  nodos: z.array(nodoDfdSchema).min(1, 'El DFD necesita al menos un nodo'),
  flujos: z.array(flujoSchema).default([]),
  nota: z.string().optional(),
})

export const diagramaSchema = z.discriminatedUnion('tipo', [organigramaSchema, dfdSchema])

export type OrganigramaEntrada = z.infer<typeof organigramaSchema>
export type DfdEntrada = z.infer<typeof dfdSchema>
