import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { extraerFicha } from "./agente.js";

const rutaPdf = process.argv[2];
if (!rutaPdf) {
  console.error("Uso: npm run extraer -- ruta/al/documento.pdf");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Falta ANTHROPIC_API_KEY. Copia .env.example como .env y pon tu clave.");
  process.exit(1);
}

const inicio = Date.now();
let ficha;
try {
  ficha = await extraerFicha(rutaPdf);
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (mensaje.includes("401") || mensaje.includes("api-key")) {
    console.error("La API key no es válida. Revisa ANTHROPIC_API_KEY en tu archivo .env.");
  } else {
    console.error(`No se pudo extraer: ${mensaje}`);
  }
  process.exit(1);
}
const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

await mkdir("salidas", { recursive: true });
const destino = join("salidas", basename(rutaPdf).replace(/\.pdf$/i, ".json"));
await writeFile(destino, JSON.stringify(ficha, null, 2));

console.log(JSON.stringify(ficha, null, 2));
console.log(`\n${ficha.items.length} materiales en ${segundos} s. Guardado en ${destino}`);
