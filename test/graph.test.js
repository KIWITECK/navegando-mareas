import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCity } from '../src/graph.js';

test('la ciudad es determinista para una misma semilla', () => {
  const a = createCity(30, 5), b = createCity(30, 5), c = createCity(30, 6);
  assert.equal(a.edges.length, b.edges.length);
  assert.notEqual(a.edges.length, c.edges.length);
});
test('las vías arteriales cuestan la mitad y todas las calles son de doble sentido', () => {
  const g = createCity(25, 1);
  const e = g.edgeBetween(0, 1);           // fila 0 es arterial
  assert.equal(g.cost(e), 0.5);
  assert.ok(g.edgeBetween(1, 0));
});
test('el tráfico multiplica el costo y devuelve el costo anterior', () => {
  const g = createCity(20, 1);
  const e = g.edgeBetween(0, 1);
  const before = g.setFactor(e.id, 3);
  assert.equal(before, 0.5);
  assert.equal(g.cost(e), 1.5);
});
