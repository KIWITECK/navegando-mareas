/**
 * Proxy de caché (patrón Proxy): mismo contrato que una estrategia de camino, pero recuerda los resultados.
 * Cada ruta guardada se indexa por las calles que usa, de modo que un cambio de tráfico invalida solo las rutas afectadas.
 */
export class CachedStrategy {
  #byKey = new Map();
  #byEdge = new Map();
  hits = 0;
  misses = 0;
  constructor(inner) { this.inner = inner; this.name = `${inner.name}+cache`; }
  find(g, from, to, opts) {
    const key = `${from}>${to}`;
    const hit = this.#byKey.get(key);
    if (hit && !opts?.trace) { this.hits++; return { ...hit, expanded: 0, cached: true }; }
    this.misses++;
    const r = this.inner.find(g, from, to, opts);
    this.#byKey.set(key, r);
    for (const e of r.edges) {
      if (!this.#byEdge.has(e.id)) this.#byEdge.set(e.id, new Set());
      this.#byEdge.get(e.id).add(key);
    }
    return r;
  }
  /** Observer de tráfico: descarta solo las rutas que pasaban por la calle modificada. */
  onTraffic({ edgeId }) {
    const keys = this.#byEdge.get(edgeId);
    if (!keys) return;
    for (const k of keys) this.#byKey.delete(k);
    this.#byEdge.delete(edgeId);
  }
  get size() { return this.#byKey.size; }
}
