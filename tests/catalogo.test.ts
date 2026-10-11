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

  it("encuentra por coincidencia parcial cuando el documento agrega palabras", () => {
    expect(buscarMaterial("Piso en ceramica 30x30")).toEqual({
      encontrado: true,
      nombre: "Baldosa cerámica 30x30",
      unidad: "m2",
      coincidencia: "parcial",
    });
  });

  it("ignora plurales en la coincidencia parcial", () => {
    const r = buscarMaterial("Puertas entamboradas de 0.90 m");
    expect(r).toMatchObject({ encontrado: true, nombre: "Puerta en madera entamborada" });
  });

  it("no adivina cuando dos materiales empatan", () => {
    // "concreto 3000 psi" y "concreto 4000 psi" coinciden con la misma cantidad de palabras.
    const r = buscarMaterial("concreto 3000 psi o concreto 4000 psi");
    expect(r.encontrado).toBe(false);
    if (!r.encontrado) {
      expect(r.sugerencias).toEqual(expect.arrayContaining(["Concreto 3000 psi", "Concreto 4000 psi"]));
    }
  });

  it("no da por encontrado un material distinto que comparte una palabra", () => {
    expect(buscarMaterial("Adoquin de concreto 20x10").encontrado).toBe(false);
    expect(buscarMaterial("Sanitario de una pieza").encontrado).toBe(false);
    expect(buscarMaterial("Cielo raso en PVC").encontrado).toBe(false);
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
