// Evaluación del prototipo: E1 estrategias de camino, E2 replanificación ante tráfico, E3 orden de paradas, E4 caché.
// Uso: node bench/run.js → imprime tablas y escribe docs/resultados.json
import { writeFileSync } from 'node:fs';
import { createCity } from '../src/graph.js';
import { rng } from '../src/prng.js';
import { DijkstraStrategy, AStarStrategy, BidirectionalStrategy, CachedStrategy } from '../src/strategies/index.js';
import { NavigationService } from '../src/service.js';
import { costMatrix, orderCost, NearestNeighbor, TwoOpt, BruteForce } from '../src/stops.js';

const f = (n, d = 2) => Number(n.toFixed(d));
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const result = { fecha: new Date().toISOString(), node: process.version };

// ---------- E1: estrategias de camino ----------
console.log('\n== E1: estrategias de camino (200 consultas por tamaño) ==');
result.e1 = [];
for (const size of [50, 100, 200]) {
  const g = createCity(size, 1);
  const r = rng(100 + size);
  const qs = Array.from({ length: 200 }, () => [Math.floor(r() * g.nodeCount), Math.floor(r() * g.nodeCount)]);
  const strategies = [new DijkstraStrategy(), new AStarStrategy(), new BidirectionalStrategy()];
  const baseline = qs.map(([s, t]) => strategies[0].find(g, s, t).cost);
  for (const st of strategies) {
    st.find(g, qs[0][0], qs[0][1]); // calentamiento
    const exp = [], ms = [];
    let mismatches = 0, unreachable = 0;
    qs.forEach(([s, t], i) => {
      const t0 = performance.now();
      const out = st.find(g, s, t);
      ms.push(performance.now() - t0);
      if (!Number.isFinite(baseline[i])) { unreachable++; return; }
      exp.push(out.expanded);
      if (Math.abs(out.cost - baseline[i]) > 1e-9) mismatches++;
    });
    const row = { cuadricula: `${size}×${size}`, nodos: g.nodeCount, estrategia: st.name, expandidos: f(mean(exp), 0), ms: f(mean(ms), 3), costoDistinto: mismatches, inalcanzables: unreachable };
    result.e1.push(row);
  }
}
for (const size of ['50×50', '100×100', '200×200']) {
  const rows = result.e1.filter((r) => r.cuadricula === size);
  const base = rows.find((r) => r.estrategia === 'dijkstra');
  rows.forEach((r) => { r.reduccionNodos = f((1 - r.expandidos / base.expandidos) * 100, 1); r.aceleracion = f(base.ms / r.ms, 2); });
}
console.table(result.e1);

// ---------- E2: replanificación ante tráfico ----------
console.log('\n== E2: 20 sesiones × 5 paradas, 400 eventos de tráfico en 100×100 ==');
function e2(policy) {
  const g = createCity(100, 2);
  const svc = new NavigationService(g, { pathStrategy: new AStarStrategy() });
  const r = rng(7);
  const sessions = Array.from({ length: 20 }, () => {
    const start = Math.floor(r() * g.nodeCount);
    const stops = Array.from({ length: 5 }, () => Math.floor(r() * g.nodeCount));
    const s = svc.session(start, stops, { policy });
    s.start();
    return s;
  });
  const base = sessions.map((s) => ({ plans: s.stats.plans, expanded: s.stats.expanded }));
  const ev = rng(99);
  const congested = [];
  const t0 = performance.now();
  for (let i = 0; i < 400; i++) {
    if (congested.length && ev() < 0.4) svc.feed.publish(congested.splice(Math.floor(ev() * congested.length), 1)[0], 1);
    else {
      // los atascos se concentran en calles que las rutas realmente usan (peor caso para la política «affected»)
      const s = sessions[Math.floor(ev() * sessions.length)];
      const legs = [...s.trip.legs()];
      const edge = legs[Math.floor(ev() * legs.length)].edge;
      svc.feed.publish(edge.id, 3 + Math.floor(ev() * 3));
      congested.push(edge.id);
    }
  }
  const ms = performance.now() - t0;
  const reroutes = sessions.reduce((a, s) => a + s.stats.reroutes, 0);
  const ignored = sessions.reduce((a, s) => a + s.stats.ignored, 0);
  const expanded = sessions.reduce((a, s, i) => a + s.stats.expanded - base[i].expanded, 0);
  // calidad: costo actual frente al óptimo recalculado con el tráfico final
  const gaps = sessions.map((s) => {
    const cur = s.trip.cost();
    const fresh = svc.session(s.current, s.stops, { policy }); // sesión nueva solo para calcular el óptimo
    fresh.plan();
    return (cur / fresh.trip.cost() - 1) * 100;
  });
  return { politica: policy, recalculos: reroutes, eventosIgnorados: ignored, nodosExpandidos: expanded, ms: f(ms, 0), brechaMediaVsOptimo: f(mean(gaps), 2), brechaMaxima: f(Math.max(...gaps), 2) };
}
result.e2 = [e2('always'), e2('affected')];
const [al, af] = result.e2;
af.reduccionRecalculos = f((1 - af.recalculos / al.recalculos) * 100, 1);
af.reduccionNodos = f((1 - af.nodosExpandidos / al.nodosExpandidos) * 100, 1);
console.table(result.e2);

// ---------- E3: orden de paradas ----------
console.log('\n== E3: 8 paradas, 40 instancias en 100×100 ==');
{
  const g = createCity(100, 3), a = new AStarStrategy(), r = rng(31);
  const acc = { 'vecino-mas-cercano': { gap: [], ms: [] }, '2-opt': { gap: [], ms: [] }, optimo: { gap: [], ms: [] } };
  for (let k = 0; k < 40; k++) {
    const pts = Array.from({ length: 9 }, () => Math.floor(r() * g.nodeCount)); // origen + 8 paradas
    const { m } = costMatrix(g, a, pts);
    const timed = (s) => { const t0 = performance.now(); const o = s.order(m); return [orderCost(m, o), performance.now() - t0]; };
    const [co, to] = timed(new BruteForce());
    acc.optimo.ms.push(to); acc.optimo.gap.push(0);
    for (const s of [new NearestNeighbor(), new TwoOpt()]) { const [c, t] = timed(s); acc[s.name].gap.push((c / co - 1) * 100); acc[s.name].ms.push(t); }
  }
  result.e3 = Object.entries(acc).map(([name, v]) => ({ estrategia: name, brechaMedia: f(mean(v.gap), 2), brechaMaxima: f(Math.max(...v.gap), 2), ms: f(mean(v.ms), 3) }));
  console.table(result.e3);
}

// ---------- E4: caché con invalidación por tráfico ----------
console.log('\n== E4: caché Proxy, 2.000 consultas hacia 200 destinos populares en 100×100 ==');
{
  const run = (useCache, withTraffic) => {
    const g = createCity(100, 4);
    const inner = new AStarStrategy();
    const cache = useCache ? new CachedStrategy(inner) : null;
    const strat = cache ?? inner;
    const svc = new NavigationService(g, { pathStrategy: strat, cache });
    const r = rng(55);
    const dests = Array.from({ length: 200 }, () => Math.floor(r() * g.nodeCount));
    const origins = Array.from({ length: 20 }, () => Math.floor(r() * g.nodeCount));
    let expanded = 0;
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) {
      const d = dests[Math.floor(Math.pow(r(), 2) * dests.length)];   // popularidad sesgada
      expanded += strat.find(g, origins[Math.floor(r() * origins.length)], d).expanded;
      if (withTraffic && i % 20 === 0) svc.feed.publish(Math.floor(r() * g.edges.length), 4);
    }
    return { cache: useCache ? 'sí' : 'no', trafico: withTraffic ? 'sí' : 'no', nodosExpandidos: expanded, ms: f(performance.now() - t0, 0), aciertos: cache ? f(cache.hits / (cache.hits + cache.misses) * 100, 1) : 0 };
  };
  result.e4 = [run(false, false), run(true, false), run(true, true)];
  const base = result.e4[0];
  result.e4.forEach((r) => { r.reduccionNodos = f((1 - r.nodosExpandidos / base.nodosExpandidos) * 100, 1); });
  console.table(result.e4);
}

writeFileSync(new URL('../docs/resultados.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('\nResultados guardados en docs/resultados.json');
