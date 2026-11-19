// Patrón Strategy (segunda familia): cómo ordenar varias paradas. La ruta es abierta y parte del índice 0.

/** Matriz de costos de viaje entre puntos, usando la estrategia de camino indicada. */
export function costMatrix(graph, pathStrategy, points) {
  const m = points.map(() => new Array(points.length).fill(0));
  let expanded = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const r = pathStrategy.find(graph, points[i], points[j]);
      m[i][j] = r.cost;
      expanded += r.expanded;
    }
  }
  return { m, expanded };
}

export const orderCost = (m, order) => order.slice(1).reduce((s, v, i) => s + m[order[i]][v], 0);

export class NearestNeighbor {
  name = 'vecino-mas-cercano';
  order(m) {
    const n = m.length, order = [0], left = new Set([...Array(n).keys()].slice(1));
    while (left.size) {
      const last = order[order.length - 1];
      let best = null;
      for (const v of left) if (best === null || m[last][v] < m[last][best]) best = v;
      order.push(best); left.delete(best);
    }
    return order;
  }
}

/** Vecino más cercano + mejora 2-opt (Croes, 1958): invierte tramos mientras el recorrido acorte. */
export class TwoOpt {
  name = '2-opt';
  order(m) {
    let order = new NearestNeighbor().order(m);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < order.length - 1; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
          if (orderCost(m, cand) < orderCost(m, order) - 1e-9) { order = cand; improved = true; }
        }
      }
    }
    return order;
  }
}

/** Referencia óptima por fuerza bruta (solo para evaluar con pocas paradas). */
export class BruteForce {
  name = 'optimo';
  order(m) {
    const n = m.length;
    let best = null, bestCost = Infinity;
    const permute = (cur, left) => {
      if (!left.length) { const c = orderCost(m, cur); if (c < bestCost) { bestCost = c; best = [...cur]; } return; }
      for (let i = 0; i < left.length; i++) {
        const rest = [...left.slice(0, i), ...left.slice(i + 1)];
        cur.push(left[i]); permute(cur, rest); cur.pop();
      }
    };
    permute([0], [...Array(n).keys()].slice(1));
    return best;
  }
}
