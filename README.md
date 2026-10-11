# Ficha Técnica

Agente de IA en TypeScript que lee un PDF de especificaciones de obra, extrae los materiales con su cantidad y unidad, los verifica contra un catálogo cerrado y devuelve un JSON validado.

Construido con **LangChain.js v1** (`createAgent`), **Claude** (Anthropic), **Zod** para la salida estructurada y **Vitest** para pruebas y evaluación.

## Cómo funciona

```
PDF ──> texto por página ──> agente (Claude) ──> herramienta buscar_en_catalogo ──> JSON validado con Zod
                                   ▲                         │
                                   └──── nombre oficial ─────┘
```

1. `leerPdf` saca el texto de cada página y marca dónde empieza cada una (`--- PÁGINA N ---`).
2. El agente lee el texto y, por cada material, llama a la herramienta `buscar_en_catalogo`.
3. Si el material existe, usa el nombre oficial; si no, lo marca con `en_catalogo: false` y deja una advertencia.
4. La respuesta sale en el formato de `FichaSchema` (Zod). Cada ítem trae la **cita literal** y la **página**, para poder verificar que no se inventó nada.

## Requisitos

- Node.js 20 o superior
- Una API key de Anthropic ([console.anthropic.com](https://console.anthropic.com))

## Instalación

```bash
npm install
cp .env.example .env   # luego edita .env y pon tu ANTHROPIC_API_KEY
```

## Uso

```bash
npm run extraer -- ejemplos/caseta-vigilancia.pdf
```

Imprime el JSON y lo guarda en `salidas/`. Ejemplo de un ítem:

```json
{
  "material": "Concreto 3000 psi",
  "cantidad": 6.2,
  "unidad": "m3",
  "pagina": 1,
  "cita": "Zapatas y vigas de cimentacion en concreto de 3000 psi: 6.2 m3.",
  "en_catalogo": true
}
```

## Pruebas y evaluación

```bash
npm test            # pruebas sin IA: lectura de PDF, catálogo, puntaje y esquema (no gastan créditos)
npm run evaluar -- 3  # corre el agente 3 veces por caso y mide precisión, cobertura y consistencia
```

La evaluación compara la salida del agente con la respuesta escrita a mano en `casos/<nombre>.json` (el PDF va en `ejemplos/<nombre>.pdf`). Un ítem es correcto si coinciden material, unidad y cantidad (±1 %).

### Resultados

4 casos con trampas a propósito: unidades que hay que convertir ("galones" → gl, "4 bultos de 50 kg" → 200 kg), unidades que no se pueden convertir ("6 volquetas"), materiales fuera del catálogo, ítems sin cantidad y el mismo material repartido en varias líneas que hay que sumar. Modelo `claude-sonnet-5-5`, 3 intentos por caso.

| Caso | Precisión | Cobertura | Igual en los 3 intentos |
| --- | --- | --- | --- |
| anden-calle-12 | 100 % | 100 % | sí |
| bano-apto-402 | 100 % | 100 % | sí |
| caseta-vigilancia | 100 % | 100 % | sí |
| oficina-piso-3 | 100 % | 100 % | sí |

**Qué cambió y por qué.** La primera evaluación dio 87 de 93 ítems correctos (caseta-vigilancia con 88 % de precisión, oficina-piso-3 con 83 %). Todos los fallos tenían la misma causa: la herramienta `buscar_en_catalogo` solo aceptaba coincidencias exactas, así que "Piso en ceramica 30x30" no encontraba el sinónimo "ceramica 30x30" y "Puertas entamboradas" (plural) no encontraba "puerta entamborada". Se agregó una coincidencia parcial: si todas las palabras de un nombre o sinónimo del catálogo aparecen en la consulta (ignorando plurales), cuenta como encontrado y se marca `coincidencia: "parcial"` para que el agente lo anote en advertencias; si dos materiales distintos empatan, no adivina. Después del cambio: 93 de 93.

**Con cautela:** son 4 documentos de ejemplo escritos para esta evaluación, y la misma persona escribió los casos y la corrección. Los documentos reales de obra son más largos y desordenados; el siguiente paso es evaluar con PDFs reales.

Los PDFs se generan desde `ejemplos/fuentes/*.html` (por ejemplo, imprimiendo a PDF con Chrome).

## Estructura

```
src/
  agente.ts      crea el agente (modelo, herramienta, instrucciones, esquema)
  catalogo.ts    búsqueda en el catálogo + herramienta para el agente
  catalogo.json  30 materiales permitidos con sus sinónimos
  esquema.ts     forma del JSON de salida (Zod)
  leerPdf.ts     PDF -> texto por página
  puntaje.ts     compara la salida con la respuesta esperada
  extraer.ts     comando para un PDF
  evaluar.ts     comando de evaluación
casos/           respuestas correctas escritas a mano
ejemplos/        PDFs de prueba (y sus fuentes HTML en ejemplos/fuentes/)
tests/           pruebas con Vitest
```

## Límites conocidos

- PDFs escaneados (imágenes) no tienen texto; habría que agregar OCR (o mandar la página como imagen a Claude).
- La evaluación usa 4 documentos de ejemplo; falta medir con documentos reales.
- Tablas complejas pueden perder su estructura al pasar a texto.
- El catálogo es un JSON pequeño; en producción estaría en una base de datos.

## Configuración

| Variable | Para qué | Por defecto |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Clave de la API de Anthropic | (obligatoria) |
| `ANTHROPIC_MODEL` | Modelo de Claude a usar | `claude-sonnet-5-5` |
