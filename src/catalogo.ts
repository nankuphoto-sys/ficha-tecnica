import { tool } from "langchain";
import * as z from "zod";
import catalogo from "./catalogo.json" with { type: "json" };

export interface MaterialCatalogo {
  nombre: string;
  unidad: string;
  sinonimos: string[];
}

const CATALOGO: MaterialCatalogo[] = catalogo;

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ResultadoBusqueda =
  | { encontrado: true; nombre: string; unidad: string }
  | { encontrado: false; sugerencias: string[] };

/**
 * Busca un material en el catálogo cerrado.
 * Coincide por nombre o sinónimo exacto (normalizado); si no, sugiere
 * los materiales que comparten más palabras.
 */
export function buscarMaterial(consulta: string): ResultadoBusqueda {
  const q = normalizar(consulta);
  for (const m of CATALOGO) {
    const candidatos = [m.nombre, ...m.sinonimos].map(normalizar);
    if (candidatos.includes(q)) {
      return { encontrado: true, nombre: m.nombre, unidad: m.unidad };
    }
  }
  const palabras = new Set(q.split(" ").filter((p) => p.length > 2));
  const puntuados = CATALOGO.map((m) => {
    const texto = normalizar([m.nombre, ...m.sinonimos].join(" "));
    const comunes = texto.split(" ").filter((p) => palabras.has(p)).length;
    return { nombre: m.nombre, comunes };
  })
    .filter((x) => x.comunes > 0)
    .sort((a, b) => b.comunes - a.comunes)
    .slice(0, 3)
    .map((x) => x.nombre);
  return { encontrado: false, sugerencias: puntuados };
}

/** La misma búsqueda, envuelta como herramienta que el agente puede llamar. */
export const buscarEnCatalogo = tool(
  async ({ material }) => JSON.stringify(buscarMaterial(material)),
  {
    name: "buscar_en_catalogo",
    description:
      "Verifica si un material existe en el catálogo cerrado de la empresa. " +
      "Devuelve el nombre oficial y su unidad, o sugerencias si no lo encuentra. " +
      "Úsala para CADA material antes de incluirlo en la respuesta.",
    schema: z.object({
      material: z.string().describe("Nombre del material como aparece en el documento"),
    }),
  },
);
