import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export interface Pagina {
  numero: number;
  texto: string;
}

/** Lee un PDF y devuelve el texto de cada página. */
export async function leerPdf(ruta: string): Promise<Pagina[]> {
  const data = await readFile(ruta);
  const parser = new PDFParse({ data });
  try {
    const resultado = await parser.getText();
    return resultado.pages.map((p) => ({ numero: p.num, texto: p.text.trim() }));
  } finally {
    await parser.destroy();
  }
}

/** Une las páginas marcando dónde empieza cada una, para que el agente pueda citar la página. */
export function paginasATexto(paginas: Pagina[]): string {
  return paginas.map((p) => `--- PÁGINA ${p.numero} ---\n${p.texto}`).join("\n\n");
}
