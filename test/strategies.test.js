import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCity } from '../src/graph.js';
import { rng } from '../src/prng.js';
import { DijkstraStrategy, AStarStrategy, BidirectionalStrategy, CachedStrategy } from '../src/strategies/index.js';

const queries = (g, n, seed) => { const r = rng(seed); return Array.from({ length: n }, () => [Math.floor(r() * g.nodeCount), Math.floor(r() * g.nodeCount)]); };

test('A* y bidireccional encuentran la misma ruta óptima que Dijkstra (300 consultas)', () => {
  const g = createCity(40, 3);
  const d = new DijkstraStrategy(), a = new AStarStrategy(), b = new BidirectionalStrategy();
  for (const [s, t] of queries(g, 300, 9)) {
    const rd = d.find(g, s, t);
    for (const other of [a.find(g, s, t), b.find(g, s, t)]) {
      assert.ok(Math.abs(other.cost - rd.cost) < 1e-9 || (rd.cost === Infinity && other.cost === Infinity), `${s}->${t}`);
    }
  }
});
test('la ruta devuelta es continua y su costo coincide con la suma de sus calles', () => {
  const g = createCity(30, 2);
  const r = new AStarStrategy().find(g, 0, g.nodeCount - 1);
  for (let i = 1; i < r.path.length; i++) assert.ok(g.edgeBetween(r.path[i - 1], r.path[i]));
  assert.ok(Math.abs(r.edges.reduce((s, e) => s + g.cost(e), 0) - r.cost) < 1e-9);
});
test('A* expande menos nodos que Dijkstra y la bidireccional también', () => {
  const g = createCity(60, 4);
  let dj = 0, as = 0, bi = 0;
  for (const [s, t] of queries(g, 100, 11)) {
    dj += new DijkstraStrategy().find(g, s, t).expanded;
    as += new AStarStrategy().find(g, s, t).expanded;
    bi += new BidirectionalStrategy().find(g, s, t).expanded;
  }
  assert.ok(as < dj && bi < dj, `dijkstra ${dj}, astar ${as}, bidireccional ${bi}`);
});
test('el origen igual al destino devuelve ruta vacía de costo cero', () => {
  const g = createCity(10, 1);
  for (const s of [new DijkstraStrategy(), new AStarStrategy(), new BidirectionalStrategy()]) assert.equal(s.find(g, 5, 5).cost, 0);
});
test('la caché (Proxy) acierta en consultas repetidas', () => {
  const g = createCity(30, 1);
  const c = new CachedStrategy(new AStarStrategy());
  c.find(g, 0, 500); const r = c.find(g, 0, 500);
  assert.equal(c.hits, 1); assert.equal(r.expanded, 0);
});
