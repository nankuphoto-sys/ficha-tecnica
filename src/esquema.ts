import * as z from "zod";

/** Unidades permitidas. Cualquier otra se rechaza en la validación. */
export const UNIDADES = ["m2", "m3", "kg", "un", "ml", "gl", "t"] as const;

export const ItemSchema = z.object({
  material: z
    .string()
    .describe("Nombre del material tal como aparece en el catálogo cerrado"),
  cantidad: z.number().nonnegative().describe("Cantidad numérica del material"),
  unidad: z
    .enum(UNIDADES)
    .describe("Unidad de medida: m2, m3, kg, un (unidades), ml (metro lineal), gl (galón), t (tonelada)"),
  pagina: z.number().int().positive().describe("Página del PDF donde aparece"),
  cita: z
    .string()
    .describe("Frase exacta copiada del PDF de donde se sacó el dato"),
  en_catalogo: z
    .boolean()
    .describe("true si el material se verificó con la herramienta buscar_en_catalogo"),
});

export const FichaSchema = z.object({
  proyecto: z.string().describe("Nombre del proyecto u obra, si aparece; si no, 'sin nombre'"),
  items: z.array(ItemSchema),
  advertencias: z
    .array(z.string())
    .describe("Datos dudosos, materiales fuera de catálogo o unidades que no se pudieron convertir"),
});

export type Item = z.infer<typeof ItemSchema>;
export type Ficha = z.infer<typeof FichaSchema>;
