import { describe, expect, it } from "vitest";
import { buscarEnCatalogo, buscarMaterial, normalizar } from "../src/catalogo.js";

describe("normalizar", () => {
  it("quita tildes, signos y mayúsculas", () => {
    expect(normalizar("  Pañete  LISO, sobre-muro ")).toBe("panete liso sobre muro");
  });
});

describe("buscarMaterial", () => {
  it("encuentra por nombre oficial", () => {
    expect(buscarMaterial("Concreto 3000 psi")).toEqual({
      encontrado: true,
      nombre: "Concreto 3000 psi",
      unidad: "m3",
    });
  });

  it("encuentra por sinónimo, sin importar tildes", () => {
    const r = buscarMaterial("acero fy 420 MPa");
    expect(r).toMatchObject({ encontrado: true, nombre: "Acero de refuerzo 60000 psi" });
  });

  it("no encuentra lo que no está y sugiere parecidos", () => {
    const r = buscarMaterial("Teja termoacustica en PVC");
    expect(r.encontrado).toBe(false);
    if (!r.encontrado) expect(r.sugerencias).toContain("Teja de fibrocemento");
  });
});

describe("herramienta buscar_en_catalogo", () => {
  it("devuelve JSON que el agente puede leer", async () => {
    const salida = await buscarEnCatalogo.invoke({ material: "ceramica 30x30" });
    expect(JSON.parse(String(salida))).toMatchObject({ encontrado: true, unidad: "m2" });
  });
});
