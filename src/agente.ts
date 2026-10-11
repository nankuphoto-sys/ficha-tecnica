import { ChatAnthropic } from "@langchain/anthropic";
import { createAgent, providerStrategy } from "langchain";
import { buscarEnCatalogo } from "./catalogo.js";
import { FichaSchema, FichaSchemaModelo, type Ficha } from "./esquema.js";
import { leerPdf, paginasATexto } from "./leerPdf.js";

const INSTRUCCIONES = `Eres un asistente que extrae materiales de documentos técnicos de construcción.

Reglas:
1. Extrae SOLO materiales con cantidad y unidad explícitas en el documento. No inventes ni estimes.
2. Antes de incluir un material, verifícalo con la herramienta buscar_en_catalogo.
   - Si existe, usa el nombre oficial que devuelve y marca en_catalogo = true.
   - Si no existe, inclúyelo con el nombre del documento, en_catalogo = false, y explícalo en advertencias.
3. "cita" debe ser texto copiado literalmente del documento.
4. "pagina" es el número indicado en la marca "--- PÁGINA N ---" donde aparece el dato.
5. Si la unidad del documento no está entre las permitidas, conviértela solo si la conversión es exacta
   (por ejemplo "metros cuadrados" -> m2, "galones" -> gl). Si no, omite el ítem y anótalo en advertencias.
6. Si el mismo material del catálogo aparece varias veces con la misma unidad, súmalo en un solo ítem
   y pon las citas separadas por " / ". "pagina" es la primera página donde aparece.`;

export function crearAgente(modelo = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5") {
  return createAgent({
    // Los modelos más nuevos de Claude no aceptan cambiar "temperature"; usamos los valores por defecto.
    model: new ChatAnthropic({ model: modelo }),
    tools: [buscarEnCatalogo],
    systemPrompt: INSTRUCCIONES,
    // Salida estructurada nativa de Anthropic: los modelos nuevos no aceptan forzar una
    // herramienta (tool_choice "any"/"tool"), que es lo que hace la estrategia por defecto.
    responseFormat: providerStrategy(FichaSchemaModelo),
  });
}

/** Lee el PDF, se lo pasa al agente y devuelve la ficha validada por Zod. */
export async function extraerFicha(rutaPdf: string): Promise<Ficha> {
  const paginas = await leerPdf(rutaPdf);
  const texto = paginasATexto(paginas);
  if (texto.replace(/--- PÁGINA \d+ ---/g, "").trim().length < 20) {
    throw new Error(
      "El PDF casi no tiene texto. Probablemente es escaneado (una imagen); prueba con otro.",
    );
  }

  const agente = crearAgente();
  const resultado = await agente.invoke({
    messages: [{ role: "user", content: `Extrae los materiales de este documento:\n\n${texto}` }],
  });

  // Doble validación: LangChain ya validó con el esquema, pero lo confirmamos.
  return FichaSchema.parse(resultado.structuredResponse);
}
