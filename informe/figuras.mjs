import { readFileSync } from 'node:fs';
import { C, INK, SOFT, LINE, text, box, arrow, svg, hline, P } from './svg-kit.mjs';

const R = JSON.parse(readFileSync(new URL('../docs/resultados.json', import.meta.url)));
const EXP = JSON.parse(readFileSync(new URL('../docs/exploracion.json', import.meta.url)));
const nf = (n, d = 0) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const STROKE = '#5B5F68';

// ---------- Figura 1: diagrama de componentes UML ----------
function comp(x, y, w, h, color, name, st) {
  const [fill, stroke] = C[color];
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;
  o += `<g fill="#fff" stroke="${LINE}" stroke-width="0.9"><rect x="${x + w - 17}" y="${y + 5}" width="11" height="8"/><rect x="${x + w - 20}" y="${y + 7}" width="6" height="2.4"/><rect x="${x + w - 20}" y="${y + 10.5}" width="6" height="2.4"/></g>`;
  o += text(x + w / 2 - 6, y + h / 2 - (st ? 1 : -4), name, { size: 10.5, weight: 700 });
  if (st) o += text(x + w / 2 - 6, y + h / 2 + 12, st, { size: 10, fill: SOFT, italic: true });
  return o;
}
export function fig1() {
  const id = 'f1';
  let b = '';
  b += P('cli') + comp(4, 128, 92, 46, 'blue', 'Cliente', 'CLI / API');
  b += P('fachada') + comp(128, 118, 130, 66, 'lilac', 'NavigationService', '«Facade»');
  b += P('sesion') + comp(300, 8, 150, 46, 'mint', 'Sesión de navegación', '«Observer»');
  b += P('cmd') + comp(300, 66, 150, 46, 'peach', 'Historial de comandos', '«Command»');
  b += P('orden') + comp(300, 124, 150, 46, 'rose', 'Orden de paradas', '«Strategy»');
  b += P('camino') + comp(300, 182, 150, 46, 'rose', 'Camino mínimo', '«Strategy»');
  b += P('ruta') + comp(300, 240, 150, 46, 'butter', 'Ruta y recorrido', '«Composite» «Iterator»');
  b += P('feed') + comp(486, 8, 134, 46, 'mint', 'Flujo de tráfico', '«Subject»');
  b += P('cache') + comp(486, 182, 134, 46, 'gray', 'Caché de rutas', '«Proxy»');
  b += P('mapa') + comp(486, 240, 134, 46, 'blue', 'Mapa vial', 'grafo con pesos');
  // interfaces (bola y socket)
  b += `<line x1="96" y1="151" x2="104" y2="151" stroke="${LINE}"/><path d="M113 142 A9 9 0 0 0 113 160" fill="none" stroke="${LINE}" stroke-width="1.1"/><circle cx="113" cy="151" r="4.5" fill="#fff" stroke="${LINE}" stroke-width="1.1"/><line x1="117.5" y1="151" x2="128" y2="151" stroke="${LINE}"/>`;
  b += text(113, 134, 'INavegar', { size: 10, fill: SOFT, halo: 1 });
  b += P('dep');
  b += arrow('M258 150 H278 V31 H298', { id });                                   // fachada crea la sesión
  b += `<path d="M298 31 H288 V263" fill="none" stroke="${LINE}" stroke-width="1.1" stroke-dasharray="4 3"/>`;
  [89, 147, 205, 263].forEach((y) => { b += arrow(`M288 ${y} H298`, { id, dash: true }); }); // la sesión usa cada pieza
  b += text(240, 62, 'crea', { size: 9.5, fill: SOFT, halo: 1 });
  b += arrow('M450 205 H484', { id, start: true });                                // caché decora el camino
  b += arrow('M486 31 H452', { id, dash: true }) + text(468, 22, 'notifica', { size: 9.5, fill: SOFT, halo: 1 });
  b += arrow('M553 54 V180', { id, dash: true }) + text(561, 120, 'notifica', { size: 9.5, fill: SOFT, anchor: 'start', halo: 1 });
  b += arrow('M553 228 V238', { id });
  b += arrow('M450 263 H484', { id }) + text(468, 256, 'lee', { size: 9.5, fill: SOFT, halo: 1 });
  return svg(id, 624, 296, 'Diagrama de componentes UML', b);
}

// ---------- Figura 2: diagrama de secuencia UML ----------
export function fig2() {
  const id = 'f2';
  const L = { cli: 40, fac: 140, ses: 250, ord: 360, cam: 470, fee: 580 };
  const names = { cli: ['Cliente'], fac: ['Navigation', 'Service'], ses: ['Sesión'], ord: ['Orden de', 'paradas'], cam: ['Camino', 'mínimo'], fee: ['Flujo de', 'tráfico'] };
  const colors = { cli: 'blue', fac: 'lilac', ses: 'mint', ord: 'rose', cam: 'rose', fee: 'mint' };
  const H = 520;
  let b = P('life');
  for (const k of Object.keys(L)) {
    b += `<line x1="${L[k]}" y1="46" x2="${L[k]}" y2="${H - 8}" stroke="#C9CBD2" stroke-width="1" stroke-dasharray="4 4"/>`;
    b += box(L[k] - 42, 6, 84, 38, colors[k], names[k], { size: 10.5 });
  }
  const bar = (k, y1, y2) => `<rect x="${L[k] - 5}" y="${y1}" width="10" height="${y2 - y1}" fill="#fff" stroke="${LINE}" stroke-width="1"/>`;
  b += bar('ses', 130, 290) + bar('cam', 150, 250) + bar('ord', 188, 210) + bar('ses', 390, 480) + bar('cam', 430, 462);
  const msg = (n, y, from, to, label, o = {}) => {
    const x1 = L[from], x2 = L[to], dir = x2 > x1 ? 1 : -1;
    return P('m' + n) + arrow(`M${x1 + dir * 5} ${y} H${x2 - dir * 5}`, { id, dash: o.ret }) + text((x1 + x2) / 2, y - 6, label, { size: 10, halo: 1, fill: o.ret ? SOFT : INK });
  };
  b += msg(1, 76, 'cli', 'fac', '1: session(origen, paradas)');
  b += msg(2, 106, 'fac', 'ses', '2: «create»');
  b += msg(3, 136, 'cli', 'ses', '3: start()');
  b += msg(4, 160, 'ses', 'cam', '4: find(i, j)  [matriz]');
  b += msg(5, 194, 'ses', 'ord', '5: order(matriz)');
  b += msg(6, 232, 'ses', 'cam', '6: find(tramo)  [por tramo]');
  b += msg(7, 278, 'ses', 'cli', '7: viaje (Composite)', { ret: true });
  b += P('alt') + `<rect x="8" y="316" width="608" height="196" rx="4" fill="none" stroke="${C.rose[1]}" stroke-width="1.1"/><path d="M8 316 h44 v14 l-7 7 h-37 z" fill="${C.rose[0]}" stroke="${C.rose[1]}" stroke-width="1.1"/>` + text(30, 329, 'opt', { size: 10.5, weight: 700 }) + text(60, 329, '[ cambia el tráfico ]', { anchor: 'start', size: 10, italic: true, fill: SOFT });
  b += msg(8, 362, 'fee', 'ses', '8: onTraffic(actualización)');
  b += P('m9') + `<path d="M255 392 h30 v14 h-30" fill="none" stroke="${LINE}" stroke-width="1.1" marker-end="url(#${id}ar)"/>` + text(292, 404, '9: ¿calle en la ruta y costo sube?', { anchor: 'start', size: 10, halo: 1 });
  b += msg(10, 432, 'ses', 'cam', '10: RerouteCommand → find()');
  b += msg(11, 470, 'ses', 'cli', '11: nueva ruta', { ret: true });
  return svg(id, 624, H, 'Diagrama de secuencia UML', b);
}

// ---------- Figura 3: diagrama de clases UML ----------
function cls(x, y, w, name, attrs = [], methods = [], o = {}) {
  const lh = 13.5, pad = 5, head = o.stereo ? 30 : 20;
  const hA = attrs.length ? attrs.length * lh + pad : 5, hM = methods.length ? methods.length * lh + pad : 5;
  const h = head + hA + hM;
  const [fill, stroke] = C[o.color ?? 'gray'];
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;
  s += `<line x1="${x}" y1="${y + head}" x2="${x + w}" y2="${y + head}" stroke="${stroke}"/><line x1="${x}" y1="${y + head + hA}" x2="${x + w}" y2="${y + head + hA}" stroke="${stroke}"/>`;
  if (o.stereo) s += text(x + w / 2, y + 11, `«${o.stereo}»`, { size: 10, fill: SOFT, italic: true });
  s += text(x + w / 2, y + head - 6, name, { size: 11, weight: 700 });
  attrs.forEach((a, i) => { s += text(x + 5, y + head + 11 + i * lh, a, { anchor: 'start', size: 10.2 }); });
  methods.forEach((m, i) => { s += text(x + 5, y + head + hA + 11 + i * lh, m, { anchor: 'start', size: 10.2 }); });
  return { svg: s, x, y, w, h, bottom: y + h, right: x + w };
}
const tri = (x, y) => `<path d="M${x} ${y} l-6 10 h12 z" fill="#fff" stroke="${STROKE}" stroke-width="1.1"/>`;               // punta hacia arriba
const triR = (x, y) => `<path d="M${x} ${y} l-10 -6 v12 z" fill="#fff" stroke="${STROKE}" stroke-width="1.1"/>`;             // punta hacia la izquierda
const dia = (x, y) => `<path d="M${x} ${y} l5 6 l-5 6 l-5 -6 z" fill="#fff" stroke="${STROKE}" stroke-width="1.1"/>`;          // rombo (agregación)
const ln = (d, dash) => `<path d="${d}" fill="none" stroke="${STROKE}" stroke-width="1.1"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
export function fig3() {
  const id = 'f3';
  let b = '';
  // --- Strategy de camino + Proxy (columna A)
  const ps = cls(0, 0, 150, 'PathStrategy', [], ['+find(g, from, to): Result'], { stereo: 'interface', color: 'rose' });
  const dj = cls(18, 66, 132, 'DijkstraStrategy', [], [], { color: 'rose' });
  const as = cls(18, 94, 132, 'AStarStrategy', [], [], { color: 'rose' });
  const bi = cls(18, 122, 132, 'BidirectionalStrategy', [], [], { color: 'rose' });
  const ca = cls(18, 150, 132, 'CachedStrategy', ['-inner: PathStrategy', '-hits, misses'], ['+find()', '+onTraffic(update)'], { color: 'gray' });
  b += P('estrategias') + ps.svg + dj.svg + as.svg + bi.svg + ca.svg;
  b += ln(`M8 ${ps.bottom + 10} V${150 + 38}`) + tri(8, ps.bottom);
  [66, 94, 122].forEach((y) => { b += ln(`M8 ${y + 11} H18`); });
  b += ln(`M8 ${150 + 38} H18`);
  // --- Observer (columna B)
  const tf = cls(196, 0, 150, 'TrafficFeed', ['-observers: Set'], ['+subscribe(o)', '+publish(edgeId, f)'], { color: 'mint' });
  const ob = cls(196, 84, 150, 'Observer', [], ['+onTraffic(update)'], { stereo: 'interface', color: 'mint' });
  const se = cls(196, 156, 150, 'NavigationSession', ['-stops, trip, policy', '-history'], ['+plan()', '+onTraffic(update)'], { color: 'mint' });
  b += P('observer') + tf.svg + ob.svg + se.svg;
  b += ln(`M271 ${tf.bottom} V${ob.y - 12}`) + dia(271, tf.bottom).replace(`M271 ${tf.bottom}`, `M271 ${tf.bottom}`);
  b += text(278, ob.y - 5, '*', { size: 10, anchor: 'start' });
  b += ln(`M271 ${se.y} V${ob.bottom + 10}`, true) + tri(271, ob.bottom);
  b += ln(`M150 ${150 + 38} H170 V${ob.y + 30} H186`, true) + triR(196, ob.y + 30);
  // --- Composite (columna C)
  const rc = cls(388, 0, 160, 'RouteComponent', [], ['+cost(): number', '+distance(): number', '+legs(): Iterator'], { stereo: 'interface', color: 'butter' });
  const lg = cls(388, 112, 72, 'Leg', ['-edge'], ['+cost()'], { color: 'butter' });
  const rt = cls(470, 112, 100, 'Route', ['-children[]'], ['+add(c)', '+cost()'], { color: 'butter' });
  b += P('composite') + rc.svg + lg.svg + rt.svg;
  b += ln(`M424 ${lg.y} V${rc.bottom + 17} H520 V${rt.y}`, true) + ln(`M474 ${rc.bottom + 17} V${rc.bottom + 10}`, true) + tri(474, rc.bottom);
  b += ln(`M570 ${rt.y + 24} H584 V${rc.y + 36} H${rc.right + 10}`) + dia(rc.right + 5, rc.y + 36).replace('l5 6 l-5 6 l-5 -6 z', 'l5 6 l-5 6 l-5 -6 z') + text(588, rc.y + 30, '*', { size: 10, anchor: 'start' });
  // --- Command (columna C inferior)
  const cm = cls(388, 188, 120, 'Command', [], ['+execute()', '+undo()'], { stereo: 'interface', color: 'peach' });
  const ch = cls(388, 268, 120, 'CommandHistory', ['-done[], undone[]'], ['+execute(cmd)', '+undo(), redo()'], { color: 'peach' });
  const c1 = cls(526, 188, 94, 'PlanTrip', [], [], { color: 'peach' });
  const c2 = cls(526, 216, 94, 'Reroute', [], [], { color: 'peach' });
  const c3 = cls(526, 244, 94, 'AddStop', [], [], { color: 'peach' });
  b += P('command') + cm.svg + ch.svg + c1.svg + c2.svg + c3.svg;
  b += ln(`M448 ${cm.bottom} V${ch.y - 12}`) + dia(448, ch.y - 12).replace('', '');
  b += ln(`M526 ${c1.y + 11} H${cm.right + 8}`, true) + ln(`M526 ${c2.y + 11} H${cm.right + 8}`, true) + ln(`M526 ${c3.y + 11} H${cm.right + 8}`, true) + ln(`M${cm.right + 8} ${c1.y + 11} V${c3.y + 11}`, true) + ln(`M${cm.right + 8} ${cm.y + 30} H${cm.right}`, true) + triR(cm.right, cm.y + 30);
  // --- Fachada y orden de paradas (parte inferior izquierda)
  const nsv = cls(0, 290, 170, 'NavigationService', ['-graph, feed', '-pathStrategy', '-orderStrategy'], ['+session(origen, paradas)'], { color: 'lilac' });
  const os = cls(196, 290, 150, 'OrderStrategy', [], ['+order(matriz): number[]'], { stereo: 'interface', color: 'rose' });
  b += P('fachada') + nsv.svg + os.svg;
  b += ln(`M170 ${nsv.y + 40} H196`, true) + `<path d="M196 ${nsv.y + 40} l-7 -4 v8 z" fill="${STROKE}"/>`;
  b += ln(`M85 ${nsv.y} V${ca.bottom + 14}`, true) + `<path d="M85 ${ca.bottom} l-4 7 h8 z" fill="${STROKE}"/>`;
  b += text(271, os.bottom + 14, 'NearestNeighbor · TwoOpt', { size: 9.5, fill: SOFT });
  return svg(id, 624, 376, 'Diagrama de clases UML', b);
}

// ---------- Figura 4: diagrama de actividad UML ----------
export function fig4() {
  const id = 'f4';
  const A = (x, y, w, h, color, label) => box(x, y, w, h, color, label.split('\n'), { size: 10.5, title: false, rx: 14 });
  const dec = (cx, cy, label, c = 'butter') => `<path d="M${cx} ${cy - 19} L${cx + 40} ${cy} L${cx} ${cy + 19} L${cx - 40} ${cy} Z" fill="${C[c][0]}" stroke="${C[c][1]}" stroke-width="1.1"/>` + text(cx, cy + 3.5, label, { size: 9.5 });
  let b = '';
  b += P('flujo') + `<circle cx="150" cy="14" r="8" fill="${INK}"/>`;
  b += arrow('M150 22 V36', { id });
  b += A(60, 36, 180, 30, 'blue', 'Recibir origen y paradas');
  b += arrow('M150 66 V84', { id });
  b += A(60, 84, 180, 40, 'rose', 'Calcular matriz de costos\n(Strategy de camino)');
  b += arrow('M150 124 V142', { id });
  b += A(60, 142, 180, 40, 'rose', 'Ordenar paradas\n(Strategy: vecino + 2-opt)');
  b += arrow('M150 182 V200', { id });
  b += A(60, 200, 180, 40, 'butter', 'Calcular cada tramo y armar\nel viaje (Composite)');
  b += arrow('M150 240 V258', { id });
  b += A(60, 258, 180, 30, 'mint', 'Emitir indicaciones (Iterator)');
  b += arrow('M150 288 V302', { id });
  b += P('evento') + dec(150, 321, '¿Evento de tráfico?');
  // sí → derecha
  b += arrow('M190 321 H330', { id }) + text(262, 314, 'sí', { size: 10, halo: 1 });
  b += dec(370, 321, '¿Afecta la ruta?');
  b += arrow('M370 340 V362', { id }) + text(378, 354, 'sí', { size: 10, anchor: 'start', halo: 1 });
  b += A(280, 362, 180, 40, 'peach', 'Replanificar\n(RerouteCommand)');
  b += arrow('M460 382 H520 V275 H242', { id });
  // no afecta → ignorar
  b += arrow('M410 321 H470', { id }) + text(440, 314, 'no', { size: 10, halo: 1 });
  b += A(470, 306, 130, 30, 'gray', 'Ignorar evento');
  b += arrow('M535 306 V275', { id });
  // no hay evento → ¿llegó?
  b += P('fin') + arrow('M150 340 V362', { id }) + text(158, 354, 'no', { size: 10, anchor: 'start', halo: 1 });
  b += dec(150, 381, '¿Llegó al destino?');
  b += arrow('M110 381 H40 V275 H58', { id }) + text(76, 374, 'no', { size: 10, halo: 1 });
  b += arrow('M150 400 V416', { id }) + text(158, 412, 'sí', { size: 10, anchor: 'start', halo: 1 });
  b += `<circle cx="150" cy="426" r="9" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cx="150" cy="426" r="5" fill="${INK}"/>`;
  return svg(id, 624, 440, 'Diagrama de actividad UML', b);
}

// ---------- Figura 5: nodos explorados por cada estrategia ----------
export function fig5() {
  const id = 'f5';
  const S = EXP.size, cell = 200 / S;
  const colors = { dijkstra: C.peach[1], astar: C.blue[1], bidirectional: C.lilac[1] };
  const label = { dijkstra: 'Dijkstra', astar: 'A*', bidirectional: 'Bidireccional' };
  let b = '';
  Object.keys(EXP.estrategias).forEach((k, i) => {
    const x0 = i * 212, e = EXP.estrategias[k];
    b += P(k) + `<rect x="${x0}" y="22" width="200" height="200" fill="#fff" stroke="#D5D6DB"/>`;
    b += e.visitados.map((v) => `<rect x="${(x0 + (v % S) * cell).toFixed(2)}" y="${(22 + Math.floor(v / S) * cell).toFixed(2)}" width="${(cell + 0.2).toFixed(2)}" height="${(cell + 0.2).toFixed(2)}" fill="${colors[k]}" fill-opacity="0.6"/>`).join('');
    b += `<polyline points="${e.ruta.map((v) => `${(x0 + (v % S) * cell + cell / 2).toFixed(2)},${(22 + Math.floor(v / S) * cell + cell / 2).toFixed(2)}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
    const pt = (v, f) => `<circle cx="${(x0 + (v % S) * cell + cell / 2).toFixed(2)}" cy="${(22 + Math.floor(v / S) * cell + cell / 2).toFixed(2)}" r="3.6" fill="${f}" stroke="${INK}" stroke-width="1"/>`;
    b += pt(EXP.from, '#fff') + pt(EXP.to, INK);
    b += text(x0 + 100, 14, `${label[k]}: ${nf(e.expandidos)} nodos`, { size: 11, weight: 700 });
    b += text(x0 + 100, 238, `costo de la ruta ${nf(e.costo, 1)}`, { size: 10, fill: SOFT });
  });
  return svg(id, 624, 250, 'Nodos explorados por cada estrategia de camino', b);
}

// ---------- Figura 6: nodos expandidos por tamaño del mapa ----------
export function fig6() {
  const id = 'f6';
  const sizes = ['50×50', '100×100', '200×200'];
  const names = ['dijkstra', 'bidirectional', 'astar'];
  const col = { dijkstra: C.peach, bidirectional: C.lilac, astar: C.blue };
  const lab = { dijkstra: 'Dijkstra', bidirectional: 'Bidireccional', astar: 'A*' };
  const x0 = 60, y0 = 16, W = 540, H = 190, max = 22000;
  const Y = (v) => y0 + H - (v / max) * H;
  let b = '';
  for (let v = 0; v <= max; v += 5000) b += hline(x0, Y(v), x0 + W, Y(v), v === 0 ? '#9A9DA6' : '#E3E4E8') + text(x0 - 6, Y(v) + 3.5, nf(v), { size: 10, anchor: 'end', fill: SOFT });
  b += `<text transform="translate(12 ${y0 + H / 2}) rotate(-90)" font-size="10.5" text-anchor="middle" fill="${SOFT}">Nodos expandidos por consulta</text>`;
  sizes.forEach((s, gi) => {
    const gx = x0 + gi * (W / 3) + 22;
    names.forEach((n, i) => {
      const r = R.e1.find((x) => x.cuadricula === s && x.estrategia === n);
      const h = (r.expandidos / max) * H, x = gx + i * 52;
      b += P(`${gi}${n}`) + `<rect x="${x}" y="${Y(r.expandidos)}" width="42" height="${h}" rx="3" fill="${col[n][0]}" stroke="${col[n][1]}" stroke-width="1.3"/>` + text(x + 21, Y(r.expandidos) - 5, nf(r.expandidos), { size: 10, weight: 700 });
    });
    b += text(gx + 78, y0 + H + 16, s, { size: 10.5, fill: SOFT });
  });
  names.forEach((n, i) => { const lx = 150 + i * 130; b += `<rect x="${lx}" y="${y0 + H + 30}" width="14" height="10" rx="4" fill="${col[n][0]}" stroke="${col[n][1]}" stroke-width="1.3"/>` + text(lx + 20, y0 + H + 39, lab[n], { anchor: 'start', size: 10.5 }); });
  return svg(id, 624, 262, 'Nodos expandidos por estrategia y tamaño del mapa', b);
}
