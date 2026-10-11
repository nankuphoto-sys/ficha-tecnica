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

| Caso | Precisión | Cobertura | Igual en los 3 intentos |
| --- | --- | --- | --- |
| caseta-vigilancia | _pendiente_ | _pendiente_ | _pendiente_ |

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
ejemplos/        PDFs de prueba
tests/           pruebas con Vitest
```

## Límites conocidos

- PDFs escaneados (imágenes) no tienen texto; habría que agregar OCR.
- Tablas complejas pueden perder su estructura al pasar a texto.
- El catálogo es un JSON pequeño; en producción estaría en una base de datos.

## Configuración

| Variable | Para qué | Por defecto |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Clave de la API de Anthropic | (obligatoria) |
| `ANTHROPIC_MODEL` | Modelo de Claude a usar | `claude-sonnet-5` |
