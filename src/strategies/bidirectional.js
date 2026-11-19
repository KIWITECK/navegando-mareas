import { MinHeap } from '../heap.js';

/** Dijkstra bidireccional (Pohl, 1971): una búsqueda desde el origen y otra desde el destino hasta encontrarse. */
export class BidirectionalStrategy {
  name = 'bidirectional';
  find(g, from, to, { trace = false } = {}) {
    const visited = trace ? [] : null;
    if (from === to) return { path: [from], edges: [], cost: 0, expanded: 0, visited };
    const n = g.nodeCount, radj = g.reverseAdj;
    const mk = (src) => {
      const S = { dist: new Float64Array(n).fill(Infinity), prev: new Array(n).fill(null), done: new Uint8Array(n), heap: new MinHeap() };
      S.dist[src] = 0; S.heap.push(0, src);
      return S;
    };
    const F = mk(from), B = mk(to);
    let mu = Infinity, meet = -1, expanded = 0;
    const advance = (S, O, forward) => {
      let item;
      do { item = S.heap.pop(); } while (item && S.done[item[1]]);
      if (!item) return;
      const [d, u] = item;
      S.done[u] = 1; expanded++;
      if (trace) visited.push(u);
      for (const e of forward ? g.adj[u] : radj[u]) {
        const v = forward ? e.to : e.from;
        const nd = d + g.cost(e);
        if (nd < S.dist[v]) { S.dist[v] = nd; S.prev[v] = e; S.heap.push(nd, v); }
        if (O.dist[v] !== Infinity && nd + O.dist[v] < mu) { mu = nd + O.dist[v]; meet = v; }
      }
    };
    for (;;) {
      const tf = F.heap.min(), tb = B.heap.min();
      if (tf === Infinity && tb === Infinity) break;
      if (tf + tb >= mu) break; // ninguna ruta pendiente puede mejorar el mejor encuentro
      if (tf <= tb) advance(F, B, true); else advance(B, F, false);
    }
    if (meet < 0) return { path: [], edges: [], cost: Infinity, expanded, visited };
    const front = [];
    for (let at = meet; at !== from; at = F.prev[at].from) front.push(F.prev[at]);
    front.reverse();
    const back = [];
    for (let at = meet; at !== to; at = B.prev[at].to) back.push(B.prev[at]);
    const edges = [...front, ...back];
    return { path: [from, ...edges.map((e) => e.to)], edges, cost: mu, expanded, visited };
  }
}
