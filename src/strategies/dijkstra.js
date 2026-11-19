import { MinHeap } from '../heap.js';

/** Estrategia de camino mínimo sin heurística: explora en círculos desde el origen (Dijkstra, 1959). */
export class DijkstraStrategy {
  name = 'dijkstra';
  find(g, from, to, { trace = false } = {}) {
    const n = g.nodeCount;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Array(n).fill(null);
    const done = new Uint8Array(n);
    const visited = trace ? [] : null;
    const heap = new MinHeap();
    dist[from] = 0;
    heap.push(0, from);
    let expanded = 0;
    while (heap.size) {
      const [d, u] = heap.pop();
      if (done[u]) continue;
      done[u] = 1;
      expanded++;
      if (trace) visited.push(u);
      if (u === to) break;
      for (const e of g.adj[u]) {
        const nd = d + g.cost(e);
        if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = e; heap.push(nd, e.to); }
      }
    }
    return build(g, from, to, dist[to], prev, expanded, visited);
  }
}

export function build(g, from, to, cost, prev, expanded, visited) {
  if (!Number.isFinite(cost)) return { path: [], edges: [], cost: Infinity, expanded, visited };
  const edges = [];
  for (let at = to; at !== from; at = prev[at].from) edges.push(prev[at]);
  edges.reverse();
  return { path: [from, ...edges.map((e) => e.to)], edges, cost, expanded, visited };
}
