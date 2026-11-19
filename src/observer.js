// Patrón Observer: el flujo de tráfico publica cambios de costo; las sesiones de navegación y la caché se suscriben.
export class TrafficFeed {
  #observers = new Set();
  constructor(graph) { this.graph = graph; }
  subscribe(observer) { this.#observers.add(observer); return () => this.#observers.delete(observer); }
  /** Aplica el cambio al mapa y avisa a todos los observadores. */
  publish(edgeId, factor) {
    const before = this.graph.setFactor(edgeId, factor);
    const after = this.graph.cost(this.graph.edges[edgeId]);
    const update = { edgeId, before, after };
    for (const o of this.#observers) o.onTraffic(update);
    return update;
  }
}
