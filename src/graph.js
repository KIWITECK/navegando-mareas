// Red vial como grafo dirigido con pesos mutables (el tráfico cambia el costo de una calle).
import { rng } from './prng.js';

export class Graph {
  constructor() {
    this.coords = [];      // id -> [x, y]
    this.adj = [];         // id -> [{ to, base, factor, id }]
    this.edges = [];       // id -> { from, to, base, factor }
    this.minUnitCost = 1;  // costo mínimo por unidad de distancia (heurística admisible)
  }
  addNode(x, y) { this.coords.push([x, y]); this.adj.push([]); return this.coords.length - 1; }
  addEdge(from, to, base) {
    const edge = { id: this.edges.length, from, to, base, factor: 1 };
    this.edges.push(edge);
    this.adj[from].push(edge);
    return edge;
  }
  get nodeCount() { return this.coords.length; }
  cost(edge) { return edge.base * edge.factor; }
  /** Calles que llegan a cada nodo (se construye una vez; comparte los objetos de arista). */
  get reverseAdj() {
    if (!this._radj) {
      this._radj = Array.from({ length: this.nodeCount }, () => []);
      for (const e of this.edges) this._radj[e.to].push(e);
    }
    return this._radj;
  }
  edgeBetween(from, to) { return this.adj[from].find((e) => e.to === to); }
  /** El tráfico multiplica el costo de una calle; factor 1 = fluido. Devuelve el costo anterior. */
  setFactor(edgeId, factor) {
    const e = this.edges[edgeId];
    const before = this.cost(e);
    e.factor = factor;
    this.version = (this.version ?? 0) + 1;
    return before;
  }
  dist(a, b) {
    const [x1, y1] = this.coords[a], [x2, y2] = this.coords[b];
    return Math.abs(x1 - x2) + Math.abs(y1 - y2); // distancia Manhattan: las calles son una cuadrícula
  }
}

/**
 * Ciudad sintética en cuadrícula: calles de doble sentido con costo 1 por cuadra,
 * vías arteriales cada 10 filas/columnas (costo 0,5) y una fracción de calles bloqueadas.
 */
export function createCity(size, seed = 1, { blocked = 0.08, arterialEvery = 10 } = {}) {
  const rand = rng(seed);
  const g = new Graph();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) g.addNode(x, y);
  const id = (x, y) => y * size + x;
  const arterial = (x, y, horizontal) => (horizontal ? y : x) % arterialEvery === 0;
  const link = (a, b, horizontal, x, y) => {
    const w = arterial(x, y, horizontal) ? 0.5 : 1;
    g.addEdge(a, b, w);
    g.addEdge(b, a, w);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x + 1 < size && (arterial(x, y, true) || rand() >= blocked)) link(id(x, y), id(x + 1, y), true, x, y);
      if (y + 1 < size && (arterial(x, y, false) || rand() >= blocked)) link(id(x, y), id(x, y + 1), false, x, y);
    }
  }
  g.minUnitCost = 0.5;
  g.size = size;
  return g;
}
