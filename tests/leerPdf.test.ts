import { describe, expect, it } from "vitest";
import { leerPdf, paginasATexto } from "../src/leerPdf.js";

describe("leerPdf", () => {
  it("lee el PDF de ejemplo página por página", async () => {
    const paginas = await leerPdf("ejemplos/caseta-vigilancia.pdf");
    expect(paginas).toHaveLength(2);
    expect(paginas[0].texto).toContain("4.5 m3");
    expect(paginas[1].texto).toContain("1250 unidades");
  });

  it("marca el inicio de cada página para poder citarla", async () => {
    const texto = paginasATexto(await leerPdf("ejemplos/caseta-vigilancia.pdf"));
    expect(texto).toContain("--- PÁGINA 1 ---");
    expect(texto).toContain("--- PÁGINA 2 ---");
  });
});
