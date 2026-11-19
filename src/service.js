// Fachada de navegación: junta estrategias, composite, observer y comandos detrás de una API pequeña.
import { Route } from './route.js';
import { costMatrix, TwoOpt } from './stops.js';
import { TrafficFeed } from './observer.js';
import { CommandHistory, PlanTripCommand, RerouteCommand } from './commands.js';

export class NavigationSession {
  history = new CommandHistory();
  stats = { plans: 0, reroutes: 0, expanded: 0, ignored: 0 };
  trip = null;
  #edgeIds = new Set();
  constructor(service, start, stops, { policy = 'affected' } = {}) {
    this.service = service; this.current = start; this.stops = [...stops]; this.policy = policy;
  }
  /** Calcula el viaje completo: ordena paradas (Strategy) y arma el Composite con una ruta por tramo. */
  plan() {
    const { graph, pathStrategy, orderStrategy } = this.service;
    const points = [this.current, ...this.stops];
    const { m, expanded } = costMatrix(graph, pathStrategy, points);
    const order = orderStrategy.order(m);
    const trip = new Route('viaje');
    let exp = expanded;
    for (let i = 1; i < order.length; i++) {
      const r = pathStrategy.find(graph, points[order[i - 1]], points[order[i]]);
      exp += r.expanded;
      trip.add(Route.fromEdges(graph, r.edges, `tramo ${i}`));
    }
    this.order = order.slice(1).map((i) => points[i]);
    this.trip = trip;
    this.#edgeIds = new Set([...trip.legs()].map((l) => l.edge.id));
    this.stats.plans++; this.stats.expanded += exp;
    return trip;
  }
  snapshot() { return { stops: [...this.stops], current: this.current, trip: this.trip, order: this.order }; }
  restore(s) { this.stops = [...s.stops]; this.current = s.current; this.trip = s.trip; this.order = s.order; this.#edgeIds = new Set(s.trip ? [...s.trip.legs()].map((l) => l.edge.id) : []); }
  start() { this.history.execute(new PlanTripCommand(this)); return this.trip; }
  /** Observer: reacciona a un cambio de tráfico según la política elegida. */
  onTraffic(update) {
    const affects = this.#edgeIds.has(update.edgeId) && update.after > update.before;
    if (this.policy === 'always' || affects) { this.history.execute(new RerouteCommand(this)); this.stats.reroutes++; }
    else this.stats.ignored++;
  }
}

export class NavigationService {
  constructor(graph, { pathStrategy, orderStrategy = new TwoOpt(), cache = null } = {}) {
    this.graph = graph; this.pathStrategy = pathStrategy; this.orderStrategy = orderStrategy;
    this.feed = new TrafficFeed(graph);
    if (cache) this.feed.subscribe(cache);
  }
  session(start, stops, opts) {
    const s = new NavigationSession(this, start, stops, opts);
    this.feed.subscribe(s);
    return s;
  }
}
