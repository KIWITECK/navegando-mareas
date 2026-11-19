// Patrón Composite: una ruta se compone de tramos (hojas) y de rutas más pequeñas (compuestos); ambos se miden igual.
const DIR = { '1,0': 'este', '-1,0': 'oeste', '0,1': 'sur', '0,-1': 'norte' };

export class Leg {
  constructor(graph, edge) { this.graph = graph; this.edge = edge; }
  cost() { return this.graph.cost(this.edge); }
  distance() { return this.graph.dist(this.edge.from, this.edge.to); }
  *legs() { yield this; }
  get from() { return this.edge.from; }
  get to() { return this.edge.to; }
  heading() {
    const [x1, y1] = this.graph.coords[this.edge.from], [x2, y2] = this.graph.coords[this.edge.to];
    return DIR[`${Math.sign(x2 - x1)},${Math.sign(y2 - y1)}`];
  }
}

export class Route {
  constructor(label = '') { this.label = label; this.children = []; }
  add(child) { this.children.push(child); return this; }
  cost() { return this.children.reduce((s, c) => s + c.cost(), 0); }
  distance() { return this.children.reduce((s, c) => s + c.distance(), 0); }
  *legs() { for (const c of this.children) yield* c.legs(); }
  static fromEdges(graph, edges, label) {
    const r = new Route(label);
    for (const e of edges) r.add(new Leg(graph, e));
    return r;
  }
}

/** Patrón Iterator: recorre la ruta tramo a tramo, sin materializarla, y la convierte en indicaciones agrupadas. */
export class InstructionIterator {
  #legs;
  #next;
  constructor(route) { this.#legs = route.legs(); this.#next = this.#legs.next(); }
  [Symbol.iterator]() { return this; }
  next() {
    if (this.#next.done) return { done: true, value: undefined };
    const first = this.#next.value;
    const heading = first.heading();
    let blocks = 0, cost = 0;
    while (!this.#next.done && this.#next.value.heading() === heading) {
      blocks += this.#next.value.distance();
      cost += this.#next.value.cost();
      this.#next = this.#legs.next();
    }
    return { done: false, value: { heading, blocks, cost, text: `Siga ${blocks} ${blocks === 1 ? 'cuadra' : 'cuadras'} al ${heading}` } };
  }
}
