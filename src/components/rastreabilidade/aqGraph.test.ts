import { describe, it, expect } from "vitest";
import {
  buildAqGraph, findGhostNodes, findDanglingOrigins, findNodesWithoutDestination, findCycles, findComponentesConexos, runValidation,
} from "./aqGraph";

describe("aqGraph", () => {
  const graph = buildAqGraph();

  it("não encontra nós fantasma (todas as colunas do banco já estão integradas ao fluxo oficial ou têm aresta)", () => {
    expect(findGhostNodes(graph)).toEqual([]);
  });

  it("detecta AQ040 (Esquadrejadeira) como origem citada por AQ020 mas não cadastrada", () => {
    const dangling = findDanglingOrigins(graph);
    expect(dangling.length).toBe(1);
    expect(dangling[0].aqsEnvolvidos).toEqual(["AQ040", "AQ020"]);
  });

  it("aponta AQ003 (Pintura do Friso) como sem destino registrado — caso esperado, não erro", () => {
    const semDestino = findNodesWithoutDestination(graph);
    expect(semDestino.length).toBe(1);
    expect(semDestino[0].aqsEnvolvidos).toEqual(["AQ003"]);
  });

  it("detecta o ciclo real AQ015 → AQ016 → AQ017 → AQ015", () => {
    const ciclos = findCycles(graph);
    expect(ciclos.length).toBe(1);
    expect(new Set(ciclos[0].aqsEnvolvidos)).toEqual(new Set(["AQ015", "AQ016", "AQ017"]));
  });

  it("detecta o componente fortemente conexo completo de 8 AQs (AQ015/016/017/019/021/039/041/042)", () => {
    const componentes = findComponentesConexos(graph);
    expect(componentes.length).toBe(1);
    expect(new Set(componentes[0].aqsEnvolvidos)).toEqual(
      new Set(["AQ015", "AQ016", "AQ017", "AQ019", "AQ021", "AQ039", "AQ041", "AQ042"])
    );
  });

  it("runValidation agrega os 4 achados esperados, ordenados por severidade (ciclo/origem_inexistente > componente_conexo/sem_destino)", () => {
    const findings = runValidation(graph);
    expect(findings.length).toBe(4);
    expect(findings.map(f => f.tipo)).toEqual(["ciclo", "origem_inexistente", "componente_conexo", "sem_destino"]);
  });
});
