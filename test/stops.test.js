import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCity } from '../src/graph.js';
import { rng } from '../src/prng.js';
import { AStarStrategy } from '../src/strategies/index.js';
import { costMatrix, orderCost, NearestNeighbor, TwoOpt, BruteForce } from '../src/stops.js';

test('2-opt nunca empeora al vecino más cercano y el óptimo nunca empeora a 2-opt (20 casos)', () => {
  const g = createCity(40, 5), r = rng(21), a = new AStarStrategy();
  for (let k = 0; k < 20; k++) {
    const pts = Array.from({ length: 7 }, () => Math.floor(r() * g.nodeCount));
    const { m } = costMatrix(g, a, pts);
    const nn = orderCost(m, new NearestNeighbor().order(m));
    const two = orderCost(m, new TwoOpt().order(m));
    const opt = orderCost(m, new BruteForce().order(m));
    assert.ok(two <= nn + 1e-9 && opt <= two + 1e-9, `nn ${nn} 2opt ${two} opt ${opt}`);
  }
});
test('todas las estrategias visitan cada parada exactamente una vez y parten del origen', () => {
  const m = [[0, 2, 9, 5], [2, 0, 4, 7], [9, 4, 0, 3], [5, 7, 3, 0]];
  for (const s of [new NearestNeighbor(), new TwoOpt(), new BruteForce()]) {
    const o = s.order(m);
    assert.equal(o[0], 0); assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
  }
});
