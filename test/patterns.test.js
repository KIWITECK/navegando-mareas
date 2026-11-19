import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCity } from '../src/graph.js';
import { AStarStrategy, CachedStrategy } from '../src/strategies/index.js';
import { Route, InstructionIterator } from '../src/route.js';
import { NavigationService } from '../src/service.js';
import { CommandHistory, AddStopCommand } from '../src/commands.js';

const city = () => createCity(30, 7);

test('Composite: el costo de un viaje es la suma de sus rutas y de sus tramos', () => {
  const g = city();
  const r = new AStarStrategy().find(g, 0, 435);
  const half = Math.floor(r.edges.length / 2);
  const trip = new Route('viaje').add(Route.fromEdges(g, r.edges.slice(0, half))).add(Route.fromEdges(g, r.edges.slice(half)));
  assert.ok(Math.abs(trip.cost() - r.cost) < 1e-9);
  assert.equal([...trip.legs()].length, r.edges.length);
});
test('Iterator: agrupa tramos consecutivos en una sola indicación', () => {
  const g = city();
  const r = new AStarStrategy().find(g, 0, 10); // 10 cuadras al este por la arteria
  const steps = [...new InstructionIterator(Route.fromEdges(g, r.edges))];
  assert.equal(steps.length, 1);
  assert.equal(steps[0].text, 'Siga 10 cuadras al este');
});
test('Observer: una sesión «affected» ignora tráfico fuera de su ruta y «always» recalcula', () => {
  const g = city();
  const svc = new NavigationService(g, { pathStrategy: new AStarStrategy() });
  const a = svc.session(0, [29], { policy: 'affected' }); a.start();
  const b = svc.session(0, [29], { policy: 'always' }); b.start();
  const far = g.edgeBetween(29 * 30 + 3, 29 * 30 + 4);                       // calle de la última fila, fuera de la ruta por la arteria
  const used = a.trip.legs().next().value.edge;                               // una calle que sí usa la ruta
  assert.ok(!(new Set([...a.trip.legs()].map((l) => l.edge.id))).has(far.id));
  svc.feed.publish(far.id, 3);
  assert.equal(a.stats.reroutes, 0); assert.equal(b.stats.reroutes, 1);
  svc.feed.publish(used.id, 4);
  assert.equal(a.stats.reroutes, 1);
});
test('Observer: tras un atasco la nueva ruta no es peor que mantener la anterior', () => {
  const g = city();
  const svc = new NavigationService(g, { pathStrategy: new AStarStrategy() });
  const s = svc.session(0, [29 * 30 + 29], { policy: 'affected' });
  s.start();
  const old = s.trip;
  svc.feed.publish([...old.legs()][3].edge.id, 6);
  assert.notEqual(s.trip, old);
  assert.ok(s.trip.cost() <= old.cost() + 1e-9);   // el costo de `old` ya refleja el atasco
});
test('Command: deshacer y rehacer restauran el viaje', () => {
  const g = city();
  const svc = new NavigationService(g, { pathStrategy: new AStarStrategy() });
  const s = svc.session(0, [29], {}); s.start();
  const h = new CommandHistory();
  const costBefore = s.trip.cost();
  h.execute(new AddStopCommand(s, 29 * 30 + 29));
  const costAfter = s.trip.cost();
  assert.ok(costAfter > costBefore);
  h.undo(); assert.ok(Math.abs(s.trip.cost() - costBefore) < 1e-9); assert.equal(s.stops.length, 1);
  h.redo(); assert.ok(Math.abs(s.trip.cost() - costAfter) < 1e-9);
});
test('Proxy + Observer: el tráfico invalida solo las rutas afectadas de la caché', () => {
  const g = city();
  const cache = new CachedStrategy(new AStarStrategy());
  const svc = new NavigationService(g, { pathStrategy: cache, cache });
  const r1 = cache.find(g, 0, 29), r2 = cache.find(g, 29 * 30, 29 * 30 + 29);
  assert.equal(cache.size, 2);
  svc.feed.publish(r1.edges[0].id, 5);
  assert.equal(cache.size, 1);                       // r2 sigue válida
  void r2;
});
