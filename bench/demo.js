// Demostración: una sesión de navegación con 4 paradas, un atasco en la ruta y comandos deshacer/rehacer.
import { createCity } from '../src/graph.js';
import { AStarStrategy, CachedStrategy } from '../src/strategies/index.js';
import { NavigationService } from '../src/service.js';
import { InstructionIterator } from '../src/route.js';

const g = createCity(60, 1);
const cache = new CachedStrategy(new AStarStrategy());
const svc = new NavigationService(g, { pathStrategy: cache, cache });
const node = (x, y) => y * 60 + x;
const session = svc.session(node(2, 2), [node(50, 12), node(15, 40), node(55, 55), node(30, 20)], { policy: 'affected' });
const trip = session.start();
console.log(`Viaje planificado: ${session.order.length} paradas, costo ${trip.cost().toFixed(1)}, ${[...trip.legs()].length} tramos`);
const steps = [...new InstructionIterator(trip.children[0])];
console.log('Primer tramo:', steps.slice(0, 4).map((s) => s.text).join(' → '));
const blocked = [...trip.legs()][10].edge;
const upd = svc.feed.publish(blocked.id, 5);
console.log(`Atasco en la calle ${blocked.id}: costo ${upd.before} → ${upd.after}; recálculos: ${session.stats.reroutes}`);
console.log(`Nuevo costo del viaje: ${session.trip.cost().toFixed(1)}`);
session.history.undo();
console.log(`Tras deshacer (vuelve la ruta anterior, ahora más cara por el atasco): costo ${session.trip.cost().toFixed(1)} (historial: ${session.history.depth} comandos)`);
