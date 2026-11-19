import { MinHeap } from '../heap.js';
import { build } from './dijkstra.js';

/**
 * A* (Hart, Nilsson y Raphael, 1968): Dijkstra guiado por una heurística admisible.
 * h(n) = distancia Manhattan × costo mínimo por unidad; nunca sobreestima, así que la ruta es óptima.
 */
export class AStarStrategy {
  name = 'astar';
  find(g, from, to, { trace = false } = {}) {
    const n = g.nodeCount;
    const gScore = new Float64Array(n).fill(Infinity);
    const prev = new Array(n).fill(null);
    const done = new Uint8Array(n);
    const visited = trace ? [] : null;
    const h = (u) => g.dist(u, to) * g.minUnitCost;
    const heap = new MinHeap();
    gScore[from] = 0;
    heap.push(h(from), from);
    let expanded = 0;
    while (heap.size) {
      const [, u] = heap.pop();
      if (done[u]) continue;
      done[u] = 1;
      expanded++;
      if (trace) visited.push(u);
      if (u === to) break;
      for (const e of g.adj[u]) {
        const ng = gScore[u] + g.cost(e);
        if (ng < gScore[e.to]) { gScore[e.to] = ng; prev[e.to] = e; heap.push(ng + h(e.to), e.to); }
      }
    }
    return build(g, from, to, gScore[to], prev, expanded, visited);
  }
}
