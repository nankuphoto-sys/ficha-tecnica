import { normalizar } from "./catalogo.js";
import type { Ficha, Item } from "./esquema.js";

export interface Puntaje {
  esperados: number;
  encontrados: number;
  correctos: number;
  /** De lo que el agente devolvió, qué porcentaje es correcto. */
  precision: number;
  /** De lo que debía encontrar, qué porcentaje encontró bien. */
  cobertura: number;
  errores: string[];
}

const clave = (i: Pick<Item, "material">) => normalizar(i.material);

/**
 * Compara la ficha del agente contra la respuesta escrita a mano.
 * Un ítem es correcto si coinciden material, unidad y cantidad (con tolerancia del 1 %).
 */
export function puntuar(obtenida: Ficha, esperada: Ficha): Puntaje {
  const errores: string[] = [];
  const porMaterial = new Map(obtenida.items.map((i) => [clave(i), i]));
  let correctos = 0;

  for (const e of esperada.items) {
    const o = porMaterial.get(clave(e));
    if (!o) {
      errores.push(`Falta: ${e.material}`);
      continue;
    }
    if (o.unidad !== e.unidad) {
      errores.push(`Unidad de ${e.material}: esperaba ${e.unidad}, obtuvo ${o.unidad}`);
      continue;
    }
    const tolerancia = Math.max(0.01 * Math.abs(e.cantidad), 1e-9);
    if (Math.abs(o.cantidad - e.cantidad) > tolerancia) {
      errores.push(`Cantidad de ${e.material}: esperaba ${e.cantidad}, obtuvo ${o.cantidad}`);
      continue;
    }
    correctos++;
  }

  const esperadosClaves = new Set(esperada.items.map(clave));
  for (const o of obtenida.items) {
    if (!esperadosClaves.has(clave(o))) errores.push(`Sobra: ${o.material}`);
  }

  const encontrados = obtenida.items.length;
  const esperados = esperada.items.length;
  return {
    esperados,
    encontrados,
    correctos,
    precision: encontrados ? correctos / encontrados : 0,
    cobertura: esperados ? correctos / esperados : 0,
    errores,
  };
}
