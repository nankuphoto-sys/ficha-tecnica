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
  | { encontrado: true; nombre: string; unidad: string; coincidencia?: "parcial" }
  | { encontrado: false; sugerencias: string[] };

/** Quita la "s" final de palabras largas para que "puertas" y "puerta" coincidan. */
const singular = (palabra: string) =>
  palabra.length > 3 && palabra.endsWith("s") ? palabra.slice(0, -1) : palabra;

const palabrasDe = (texto: string) => normalizar(texto).split(" ").filter(Boolean).map(singular);

/**
 * Busca un material en el catálogo cerrado.
 * 1. Coincidencia exacta con el nombre o un sinónimo (normalizado).
 * 2. Coincidencia parcial: todas las palabras de un nombre o sinónimo aparecen en la consulta
 *    ("Piso en ceramica 30x30" contiene "ceramica 30x30"). Gana el candidato más largo; si dos
 *    materiales distintos empatan, no adivina y los devuelve como sugerencias.
 * 3. Si no, sugiere los materiales que comparten más palabras.
 */
export function buscarMaterial(consulta: string): ResultadoBusqueda {
  const q = normalizar(consulta);
  for (const m of CATALOGO) {
    const candidatos = [m.nombre, ...m.sinonimos].map(normalizar);
    if (candidatos.includes(q)) {
      return { encontrado: true, nombre: m.nombre, unidad: m.unidad };
    }
  }

  const palabrasConsulta = new Set(palabrasDe(consulta));
  let mejorLargo = 0;
  let mejores: MaterialCatalogo[] = [];
  for (const m of CATALOGO) {
    for (const candidato of [m.nombre, ...m.sinonimos]) {
      const palabras = palabrasDe(candidato);
      if (!palabras.every((p) => palabrasConsulta.has(p))) continue;
      if (palabras.length > mejorLargo) {
        mejorLargo = palabras.length;
        mejores = [m];
      } else if (palabras.length === mejorLargo && !mejores.includes(m)) {
        mejores.push(m);
      }
    }
  }
  if (mejores.length === 1) {
    const [m] = mejores;
    return { encontrado: true, nombre: m.nombre, unidad: m.unidad, coincidencia: "parcial" };
  }
  if (mejores.length > 1) {
    return { encontrado: false, sugerencias: mejores.map((m) => m.nombre).slice(0, 3) };
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
      'Si devuelve coincidencia "parcial", usa el nombre oficial y anota la equivalencia en advertencias. ' +
      "Úsala para CADA material antes de incluirlo en la respuesta.",
    schema: z.object({
      material: z.string().describe("Nombre del material como aparece en el documento"),
    }),
  },
);
