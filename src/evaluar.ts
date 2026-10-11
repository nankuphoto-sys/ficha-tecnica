import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { extraerFicha } from "./agente.js";
import { FichaSchema } from "./esquema.js";
import { puntuar } from "./puntaje.js";

/**
 * Evaluación: por cada casos/<nombre>.json busca ejemplos/<nombre>.pdf,
 * corre el agente N veces y reporta precisión, cobertura y consistencia.
 * Uso: npm run evaluar -- 3
 */
const repeticiones = Number(process.argv[2] ?? 3);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Falta ANTHROPIC_API_KEY en .env");
  process.exit(1);
}

const casos = (await readdir("casos")).filter((f) => f.endsWith(".json"));
const pct = (x: number) => `${Math.round(x * 100)} %`;
const filas: string[] = [];

for (const archivo of casos) {
  const nombre = archivo.replace(/\.json$/, "");
  const esperada = FichaSchema.parse(JSON.parse(await readFile(join("casos", archivo), "utf8")));
  const coberturas: number[] = [];
  const precisiones: number[] = [];

  for (let i = 1; i <= repeticiones; i++) {
    const obtenida = await extraerFicha(join("ejemplos", `${nombre}.pdf`));
    const p = puntuar(obtenida, esperada);
    coberturas.push(p.cobertura);
    precisiones.push(p.precision);
    console.log(`${nombre} · intento ${i}: ${p.correctos}/${p.esperados} correctos`);
    for (const e of p.errores) console.log(`   - ${e}`);
  }

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const consistente = new Set(coberturas).size === 1 ? "sí" : "no";
  filas.push(`| ${nombre} | ${pct(media(precisiones))} | ${pct(media(coberturas))} | ${consistente} |`);
}

console.log(`\n| Caso | Precisión | Cobertura | Igual en los ${repeticiones} intentos |`);
console.log("| --- | --- | --- | --- |");
for (const f of filas) console.log(f);
