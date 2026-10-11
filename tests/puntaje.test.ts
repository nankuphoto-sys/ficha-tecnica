import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FichaSchema, type Ficha } from "../src/esquema.js";
import { puntuar } from "../src/puntaje.js";

const esperada: Ficha = FichaSchema.parse(
  JSON.parse(readFileSync("casos/caseta-vigilancia.json", "utf8")),
);

describe("el caso escrito a mano", () => {
  it("cumple el esquema", () => {
    expect(esperada.items).toHaveLength(10);
  });
});

describe("puntuar", () => {
  it("da 100 % si la respuesta es idéntica", () => {
    const p = puntuar(esperada, esperada);
    expect(p.precision).toBe(1);
    expect(p.cobertura).toBe(1);
    expect(p.errores).toEqual([]);
  });

  it("detecta cantidades erradas, unidades erradas, faltantes y sobrantes", () => {
    const items = esperada.items.map((i) => ({ ...i }));
    items[0].cantidad = 9; // cantidad errada
    items[1].unidad = "m2"; // unidad errada
    items.pop(); // falta la teja
    items.push({ ...items[2], material: "Material inventado" }); // sobra

    const p = puntuar({ ...esperada, items }, esperada);
    expect(p.correctos).toBe(7);
    expect(p.cobertura).toBeCloseTo(0.7);
    expect(p.errores).toHaveLength(4);
  });

  it("tolera diferencias de redondeo menores al 1 %", () => {
    const items = esperada.items.map((i) => ({ ...i, cantidad: i.cantidad * 1.005 }));
    expect(puntuar({ ...esperada, items }, esperada).correctos).toBe(10);
  });
});

describe("validación del esquema", () => {
  it("rechaza unidades fuera de la lista", () => {
    const mala = { ...esperada, items: [{ ...esperada.items[0], unidad: "litros" }] };
    expect(() => FichaSchema.parse(mala)).toThrow();
  });
});
