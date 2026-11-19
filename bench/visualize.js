// Evidencia visual: mapa de nodos explorados por cada estrategia para la misma consulta (docs/exploracion-*.svg y .json).
import { writeFileSync } from 'node:fs';
import { createCity } from '../src/graph.js';
import { strategies } from '../src/strategies/index.js';

const SIZE = 60, CELL = 8;
const g = createCity(SIZE, 1);
const from = 4 * SIZE + 4, to = 50 * SIZE + 55;
const data = { size: SIZE, from, to, estrategias: {} };
const COLORS = { dijkstra: '#F4B99A', astar: '#8DB7DD', bidirectional: '#AE9BD9' };
for (const [name, make] of Object.entries(strategies)) {
  const r = make().find(g, from, to, { trace: true });
  data.estrategias[name] = { expandidos: r.expanded, costo: r.cost, visitados: r.visited, ruta: r.path };
  const rects = r.visited.map((id) => `<rect x="${(id % SIZE) * CELL}" y="${Math.floor(id / SIZE) * CELL}" width="${CELL}" height="${CELL}" fill="${COLORS[name]}" fill-opacity="0.55"/>`).join('');
  const pts = r.path.map((id) => `${(id % SIZE) * CELL + CELL / 2},${Math.floor(id / SIZE) * CELL + CELL / 2}`).join(' ');
  const mark = (id, c) => `<circle cx="${(id % SIZE) * CELL + CELL / 2}" cy="${Math.floor(id / SIZE) * CELL + CELL / 2}" r="5" fill="${c}" stroke="#222" stroke-width="1"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE * CELL} ${SIZE * CELL}" width="480" height="480"><rect width="100%" height="100%" fill="#fff" stroke="#ccc"/>${rects}<polyline points="${pts}" fill="none" stroke="#222" stroke-width="2"/>${mark(from, '#fff')}${mark(to, '#222')}</svg>`;
  writeFileSync(new URL(`../docs/exploracion-${name}.svg`, import.meta.url), svg);
  console.log(`${name}: ${r.expanded} nodos expandidos, costo ${r.cost}`);
}
writeFileSync(new URL('../docs/exploracion.json', import.meta.url), JSON.stringify(data));
