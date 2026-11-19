// Genera informe.html (APA 7, carta) y lo exporta a PDF con Chrome headless en dos pasadas.
// Uso: node informe/build.mjs   ·   VIDEO=https://youtu.be/xxxx node informe/build.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as F from './figuras.mjs';

const dir = new URL('.', import.meta.url).pathname;
const R = JSON.parse(readFileSync(new URL('../docs/resultados.json', import.meta.url)));
const X = JSON.parse(readFileSync(new URL('../docs/exploracion.json', import.meta.url))).estrategias;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIDEO = process.env.VIDEO ?? '';
const REPO = 'https://github.com/KIWITECK/navegando-mareas';
const TITLE = 'Navegación eficiente de rutas con tráfico dinámico: arquitectura, patrones y prototipo';
const nf = (n, d = 0) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- numeración automática ----------
const counters = { t: 0, f: 0 }, nums = {}, toc = [];
let tocId = 0;
const slug = () => `h${++tocId}`;
const h1 = (s, o = {}) => { const id = slug(); toc.push({ id, level: 1, text: s }); return `<h1 id="${id}"${o.pb ? ' class="pb"' : ''}>${s}</h1>`; };
const h2 = (s) => { const id = slug(); toc.push({ id, level: 2, text: s }); return `<h2 id="${id}">${s}</h2>`; };
const p = (s) => `<p>${s}</p>`;
function fig(key, title, svgHtml, note) {
  nums[`f:${key}`] = ++counters.f;
  return `<figure class="fig"><div class="lab">Figura ${counters.f}</div><div class="ttl">${title}</div>${svgHtml}${note ? `<div class="note"><i>Nota.</i> ${note}</div>` : ''}</figure>`;
}
function tbl(key, title, head, rows, note, o = {}) {
  nums[`t:${key}`] = ++counters.t;
  const cols = o.widths ? `<colgroup>${o.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  return `<div class="tbl${o.split ? ' split' : ''}"><div class="lab">Tabla ${counters.t}</div><div class="ttl">${title}</div><table class="apa">${cols}<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>${note ? `<div class="note"><i>Nota.</i> ${note}</div>` : ''}</div>`;
}
const cap = (html) => html.replace(/(^|<p>|<p class="ref">|\. |\.\s)la (Tabla|Figura) (\d+)/g, (m, a, k, n) => `${a}La ${k} ${n}`);
const ref = (html) => cap(html.replace(/\[\[([tf]):(\w+)\]\]/g, (_, k, key) => `${k === 't' ? 'la Tabla' : 'la Figura'} ${nums[`${k}:${key}`] ?? '??'}`));

// ---------- datos ----------
const e1 = (size, name) => R.e1.find((r) => r.cuadricula === size && r.estrategia === name);
const [al, af] = R.e2;
const nn = R.e3.find((r) => r.estrategia === 'vecino-mas-cercano'), two = R.e3.find((r) => r.estrategia === '2-opt'), opt = R.e3.find((r) => r.estrategia === 'optimo');
const [c0, c1, c2] = R.e4;

const body = [];
const add = (...x) => body.push(...x);

add(`<div class="title-repeat">${TITLE}</div>`);
add(h1('Descripción del problema'));
add(h2('Problema de navegación seleccionado'));
add(p('Un mensajero debe visitar varias paradas por una ciudad cuyas calles cambian de costo según el tráfico. El sistema debe resolver tres cosas: encontrar el camino más barato entre dos puntos, decidir en qué orden visitar las paradas y reaccionar cuando el tráfico encarece la ruta que ya está en marcha. El problema se delimita a una ciudad modelada como cuadrícula de calles con costo por cuadra, vías arteriales más rápidas y calles bloqueadas, y a tres objetivos medibles: eficiencia del cálculo, calidad de la ruta y economía de la replanificación.'));
add(h2('Relevancia e impacto'));
add(p(`La relevancia es doble. En rendimiento, calcular rutas sin guía explora una porción enorme del mapa: en una ciudad de 40.000 nodos, el algoritmo de Dijkstra (1959) expande en promedio ${nf(e1('200×200', 'dijkstra').expandidos)} nodos por consulta. En eficiencia operativa, si cada cambio de tráfico obliga a recalcular todas las rutas activas, el costo crece con el número de sesiones y de eventos; con 20 sesiones y 400 eventos, la política ingenua realizó ${nf(al.recalculos)} recálculos. En experiencia de usuario, una ruta obsoleta significa retrasos que podían evitarse. Los problemas de planificación de rutas en redes de transporte son un campo consolidado, con técnicas de aceleración específicas (Bast et al., 2016), lo que confirma su importancia práctica.`));

add(h1('Investigación y análisis'));
add(h2('Estrategias de navegación en la literatura'));
add(p('Dijkstra (1959) halla el camino mínimo explorando en círculos desde el origen. A* (Hart et al., 1968) añade una heurística admisible que orienta la búsqueda hacia el destino sin perder optimalidad. La búsqueda bidireccional (Pohl, 1971) explora desde ambos extremos hasta que se encuentran. Para ordenar varias paradas, el vecino más cercano es una heurística rápida pero imprecisa (Rosenkrantz et al., 1977), y la mejora 2-opt (Croes, 1958) reduce el recorrido invirtiendo tramos. Los sistemas reales de mapas combinan estas ideas con preprocesamiento jerárquico (Bast et al., 2016); aquí se estudia el núcleo algorítmico y su arquitectura, que es lo que decide cuánto cambia el código al sustituir una técnica por otra.'));
add(h2('Criterios de diseño'));
add(p('Del análisis se derivaron cinco criterios que guían el diseño y que se miden en la evaluación ([[t:crit]]).'));
add(tbl('crit', 'Criterios de diseño y métricas', ['Criterio', 'Qué exige', 'Métrica'], [
  ['Eficiencia', 'Menos trabajo por consulta', 'Nodos expandidos y milisegundos'],
  ['Calidad de la ruta', 'Rutas óptimas o casi óptimas', 'Costo frente a Dijkstra y frente al óptimo'],
  ['Reactividad', 'Responder al tráfico sin recalcular de más', 'Recálculos y nodos tras cada evento'],
  ['Extensibilidad', 'Cambiar de algoritmo sin tocar el servicio', 'Estrategias intercambiables y pruebas'],
  ['Escalabilidad', 'Crecer con el tamaño del mapa', 'Reducción de nodos de 2.500 a 40.000'],
], 'Elaboración propia a partir de la literatura citada.', { widths: ['22%', '42%', '36%'] }));

add(h1('Diseño y modelado arquitectónico'));
add(h2('Arquitectura de componentes'));
add(p('[[f:comp]] muestra la estructura. El cliente usa una fachada, <i>NavigationService</i>, que oculta las piezas internas y crea sesiones de navegación. Cada sesión usa un orden de paradas y un camino mínimo, ambos intercambiables, y construye el viaje como una ruta compuesta que se recorre con un iterador. El flujo de tráfico notifica a las sesiones y a la caché, que descarta solo las rutas afectadas; el mapa vial es un grafo cuyos pesos cambian.'));
add(fig('comp', 'Diagrama de componentes UML del sistema de navegación', F.fig1(), 'Elaboración propia con notación UML 2.5.1 (Object Management Group, 2017). Las líneas punteadas indican uso o notificación.'));
add(h2('Flujo de navegación'));
add(p('[[f:sec]] representa la secuencia. Al iniciar, la sesión calcula la matriz de costos con el camino mínimo (4), ordena las paradas (5), calcula cada tramo (6) y devuelve el viaje compuesto (7). El fragmento <i>opt</i> modela el evento de tráfico: el flujo notifica a la sesión (8), esta comprueba si la calle está en la ruta y si su costo sube (9) y, solo entonces, ejecuta un comando de replanificación (10) que devuelve la nueva ruta (11).'));
add(fig('sec', 'Diagrama de secuencia UML: planificación y replanificación ante tráfico', F.fig2(), 'Elaboración propia. Las barras estrechas son las activaciones de cada participante.'));
add(h2('Lógica interna'));
add(p('[[f:cls]] detalla las clases. <i>PathStrategy</i> y <i>OrderStrategy</i> son interfaces con implementaciones intercambiables; <i>CachedStrategy</i> implementa la misma interfaz que envuelve y también <i>Observer</i>. <i>RouteComponent</i> es la interfaz común de <i>Leg</i> y <i>Route</i>, que agrega componentes. <i>CommandHistory</i> agrega comandos con operaciones de deshacer y rehacer.'));
add(fig('cls', 'Diagrama de clases UML', F.fig3(), 'Elaboración propia. Se muestran las clases y relaciones principales; los métodos auxiliares se omiten.'));
add(p('[[f:act]] recoge el flujo de actividad, con las dos decisiones que concentran la optimización: si hay un evento de tráfico y si afecta la ruta vigente.'));
add(fig('act', 'Diagrama de actividad UML del recorrido', F.fig4(), 'Elaboración propia. Las flechas de retorno vuelven a la emisión de indicaciones.'));
add(h2('Patrones de diseño seleccionados'));
add(p('Cada patrón responde a una necesidad concreta del problema (Gamma et al., 1994), como resume [[t:pat]].'));
add(tbl('pat', 'Patrones de diseño: problema, aplicación y justificación', ['Patrón', 'Problema que resuelve', 'Aplicación', 'Justificación'], [
  ['Strategy', 'Cambiar de algoritmo sin tocar el cliente', 'Camino mínimo y orden de paradas', 'Permitió comparar Dijkstra, A* y bidireccional con el mismo servicio'],
  ['Composite', 'Tratar igual un tramo y una ruta compuesta', 'Leg y Route', 'El costo de un viaje es la suma recursiva de sus partes'],
  ['Iterator', 'Recorrer sin exponer la estructura', 'InstructionIterator', 'Genera indicaciones agrupadas de forma perezosa'],
  ['Observer', 'Avisar cambios sin acoplar', 'TrafficFeed, sesión y caché', 'Permite replanificar solo cuando el cambio importa'],
  ['Command', 'Encapsular acciones reversibles', 'Planificar, añadir parada y replanificar', 'Habilita deshacer y rehacer'],
  ['Proxy', 'Evitar recálculos repetidos', 'CachedStrategy', 'Misma interfaz con caché e invalidación por calle'],
  ['Facade', 'Simplificar el uso', 'NavigationService', 'Una API pequeña para el cliente'],
], 'Elaboración propia a partir de Gamma et al. (1994).', { cls: 'wide', split: true, widths: ['13%', '27%', '26%', '34%'] }));

add(h1('Implementación del prototipo'));
add(p(`El prototipo está escrito en JavaScript (Node.js 25) sin dependencias externas y se organiza en un módulo por pieza de la arquitectura. La ciudad se genera de forma determinista con una semilla: calles de doble sentido con costo 1 por cuadra, arterias cada 10 filas y columnas con costo 0,5 y 8 % de calles bloqueadas. La heurística de A* es la distancia Manhattan multiplicada por el costo mínimo por unidad (0,5), que no sobreestima y, por tanto, conserva la optimalidad. Dieciséis pruebas automáticas verifican que las tres estrategias devuelven el mismo costo en 300 consultas aleatorias, la continuidad de las rutas, el comportamiento de cada patrón y que el orden de paradas 2-opt nunca empeora al del vecino más cercano. El código fuente está en ${REPO}.`));

add(h1('Pruebas y resultados'));
add(p('Las mediciones se hicieron en un equipo con procesador Apple M4 y Node.js 25.6, con semillas fijas para que cualquiera pueda reproducirlas con <code>npm run bench</code>. Se evaluaron cuatro aspectos con la ciudad sintética; no se usaron datos de calles reales, lo que limita la generalización.'));
add(h2('Eficiencia de las estrategias de camino'));
add(p(`[[f:viz]] muestra una misma consulta: Dijkstra explora ${nf(X.dijkstra.expandidos)} nodos, A* explora ${nf(X.astar.expandidos)} y la bidireccional ${nf(X.bidirectional.expandidos)}, con la misma ruta de costo ${nf(X.astar.costo, 1)}. [[t:e1]] y [[f:barras]] generalizan el resultado con 200 consultas por tamaño de mapa: A* reduce los nodos expandidos entre ${nf(e1('50×50', 'astar').reduccionNodos, 1)} % y ${nf(e1('200×200', 'astar').reduccionNodos, 1)} % y es de ${nf(e1('50×50', 'astar').aceleracion, 1)} a ${nf(e1('200×200', 'astar').aceleracion, 1)} veces más rápido, con ventaja creciente al aumentar el mapa; en ninguna consulta el costo difirió del de Dijkstra.`));
add(fig('viz', 'Nodos explorados por cada estrategia para la misma consulta (mapa de 60×60)', F.fig5(), 'Elaboración propia con el prototipo (<code>npm run viz</code>). La línea oscura es la ruta; el círculo blanco, el origen.'));
add(tbl('e1', 'Estrategias de camino por tamaño del mapa (200 consultas)', ['Mapa', 'Estrategia', 'Nodos expandidos', 'Reducción', 'ms por consulta', 'Aceleración'],
  R.e1.map((r) => [r.cuadricula, { dijkstra: 'Dijkstra', astar: 'A*', bidirectional: 'Bidireccional' }[r.estrategia], nf(r.expandidos), r.estrategia === 'dijkstra' ? '—' : `${nf(r.reduccionNodos, 1)} %`, nf(r.ms, 3), r.estrategia === 'dijkstra' ? '—' : `${nf(r.aceleracion, 1)}×`]),
  'Elaboración propia. Media de 200 consultas por configuración; costo distinto de Dijkstra: 0 casos en todas.', { split: true, widths: ['14%', '20%', '19%', '15%', '16%', '16%'] }));
add(fig('barras', 'Nodos expandidos por consulta según estrategia y tamaño del mapa', F.fig6(), 'Elaboración propia con los datos de la Tabla 1.'));
add(h2('Replanificación ante cambios de tráfico'));
add(p(`En 20 sesiones de 5 paradas se publicaron 400 eventos de tráfico, concentrados en calles que las rutas usan (el caso más exigente). Recalcular siempre exige ${nf(al.recalculos)} replanificaciones y ${nf(al.nodosExpandidos)} nodos expandidos; recalcular solo cuando el evento afecta la ruta y su costo sube las reduce ${nf(af.reduccionRecalculos, 1)} % y ${nf(af.reduccionNodos, 1)} %, a cambio de una brecha media de ${nf(af.brechaMediaVsOptimo, 2)} % frente al óptimo recalculado (máxima ${nf(af.brechaMaxima, 2)} %), porque la política ignora los alivios de tráfico en calles fuera de la ruta ([[t:e2]]).`));
add(tbl('e2', 'Política de replanificación ante 400 eventos de tráfico', ['Política', 'Recálculos', 'Eventos ignorados', 'Nodos expandidos', 'Brecha media', 'Brecha máxima'], [
  ['Siempre (ingenua)', nf(al.recalculos), nf(al.eventosIgnorados), nf(al.nodosExpandidos), '0,00 %', '0,00 %'],
  ['Solo si afecta la ruta (Observer)', nf(af.recalculos), nf(af.eventosIgnorados), nf(af.nodosExpandidos), `${nf(af.brechaMediaVsOptimo, 2)} %`, `${nf(af.brechaMaxima, 2)} %`],
], 'Elaboración propia. La brecha compara el costo final con el óptimo recalculado con el tráfico final.', { widths: ['28%', '13%', '15%', '18%', '13%', '13%'] }));
add(h2('Orden de paradas y caché'));
add(p(`Con 8 paradas y 40 instancias, el vecino más cercano queda ${nf(nn.brechaMedia, 2)} % por encima del óptimo (hasta ${nf(nn.brechaMaxima, 1)} %), mientras que 2-opt queda a ${nf(two.brechaMedia, 2)} %, en ${nf(two.ms, 3)} ms frente a ${nf(opt.ms, 1)} ms de la fuerza bruta. La caché con invalidación por calle evitó ${nf(c1.reduccionNodos, 1)} % de la exploración con ${nf(c1.aciertos, 1)} % de aciertos y mantuvo ${nf(c2.reduccionNodos, 1)} % con tráfico en marcha, porque el Observer invalida solo lo afectado ([[t:otros]]).`));
add(tbl('otros', 'Orden de paradas (8 paradas, 40 instancias) y caché de rutas (2.000 consultas)', ['Prueba', 'Variante', 'Resultado'], [
  ['Orden de paradas', 'Vecino más cercano', `brecha media ${nf(nn.brechaMedia, 2)} % · máxima ${nf(nn.brechaMaxima, 2)} %`],
  ['Orden de paradas', '2-opt', `brecha media ${nf(two.brechaMedia, 2)} % · máxima ${nf(two.brechaMaxima, 2)} %`],
  ['Orden de paradas', 'Fuerza bruta (óptimo)', `${nf(opt.ms, 1)} ms por instancia`],
  ['Caché', 'Sin caché', `${nf(c0.nodosExpandidos)} nodos`],
  ['Caché', 'Con caché, sin tráfico', `${nf(c1.nodosExpandidos)} nodos · ${nf(c1.aciertos, 1)} % de aciertos`],
  ['Caché', 'Con caché y tráfico', `${nf(c2.nodosExpandidos)} nodos · ${nf(c2.aciertos, 1)} % de aciertos`],
], 'Elaboración propia.', { widths: ['22%', '34%', '44%'] }));
add(p('Los límites son claros: el mapa es sintético, la medición se hizo en una sola máquina y el tráfico es simulado; la política selectiva sacrifica una pequeña calidad por eficiencia.'));

add(h1('Conclusiones'));
add(p('El problema quedó delimitado y se resolvió con una arquitectura de piezas intercambiables, que permitió comparar técnicas con el mismo servicio. La decisión más rentable fue sustituir Dijkstra por A*, que reduce entre 83 % y 90 % la exploración sin perder optimalidad, y la segunda fue replanificar solo cuando el tráfico afecta la ruta, que reduce 94 % los recálculos con una pérdida media de 0,35 %.'));
add(p('Los patrones no fueron decorativos: Strategy hizo posible la evaluación, y Observer y Command hicieron barata y reversible la reacción al tráfico. Como trabajo futuro, queda validar con datos de calles reales e incorporar técnicas jerárquicas de aceleración (Bast et al., 2016). El trabajo lo realizó una sola persona, aunque la actividad propone equipos.'));

const refs = [
  'Bast, H., Delling, D., Goldberg, A., Müller-Hannemann, M., Pajor, T., Sanders, P., Wagner, D., y Werneck, R. F. (2016). Route planning in transportation networks. En L. Kliemann y P. Sanders (Eds.), <i>Algorithm engineering: Selected results and surveys</i> (pp. 19–80). Springer. https://doi.org/10.1007/978-3-319-49487-6_2',
  'Croes, G. A. (1958). A method for solving traveling-salesman problems. <i>Operations Research, 6</i>(6), 791–812. https://doi.org/10.1287/opre.6.6.791',
  'Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. <i>Numerische Mathematik, 1</i>(1), 269–271. https://doi.org/10.1007/BF01386390',
  'Gamma, E., Helm, R., Johnson, R., y Vlissides, J. (1994). <i>Design patterns: Elements of reusable object-oriented software</i>. Addison-Wesley.',
  'Hart, P. E., Nilsson, N. J., y Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. <i>IEEE Transactions on Systems Science and Cybernetics, 4</i>(2), 100–107. https://doi.org/10.1109/TSSC.1968.300136',
  'Object Management Group. (2017). <i>Unified Modeling Language (UML), versión 2.5.1</i>. https://www.omg.org/spec/UML/2.5.1/PDF',
  'Pohl, I. (1971). Bi-directional search. <i>Machine Intelligence, 6</i>, 127–140.',
  'Rosenkrantz, D. J., Stearns, R. E., y Lewis, P. M. (1977). An analysis of several heuristics for the traveling salesman problem. <i>SIAM Journal on Computing, 6</i>(3), 563–581. https://doi.org/10.1137/0206041',
];
add(h1('Referencias', { pb: true }));
add(refs.map((r) => `<p class="ref">${r}</p>`).join(''));

// ---------- ensamblado ----------
const CSS = `
@page { size: letter; margin: 1in; @top-right { content: counter(page); font: 11pt Arial, Helvetica, sans-serif; color:#000; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 11pt/2 Arial, Helvetica, sans-serif; color: #000; margin: 0; hyphens: manual; }
p { margin: 0; text-indent: .5in; orphans: 2; widows: 2; }
a { color: #000; text-decoration: underline; word-break: break-all; }
code { font: 9.5pt/1 Menlo, Consolas, monospace; }
h1 { font-size: 11pt; font-weight: 700; text-align: center; margin: 0; break-after: avoid; }
h1.pb { break-before: page; }
h2 { font-size: 11pt; font-weight: 700; text-align: left; margin: 0; break-after: avoid; }
.title-repeat { font-weight: 700; text-align: center; break-before: page; break-after: avoid; line-height: 1.5; margin-bottom: 8pt; }
.cover { height: 9in; padding-top: 1.7in; text-align: center; line-height: 25.2pt; break-after: page; }
.cover .t { font-weight: 700; margin-bottom: 24pt; line-height: 1.5; padding: 0 .3in; }
.cover div { margin-bottom: 9pt; }
.toc-h { text-align: center; font-weight: 700; break-after: avoid; }
.toc-row { display: flex; align-items: baseline; line-height: 1.7; }
.toc-row .lbl { flex: none; max-width: 5.6in; }
.toc-row .dots { flex: 1; border-bottom: 1px dotted #000; margin: 0 4pt; transform: translateY(-3pt); min-width: 12pt; }
.toc-row .pg { flex: none; width: 1.6em; text-align: right; }
.toc-row.l2 { padding-left: .3in; }
.toc-row.l1 { font-weight: 700; }
.tbl, .fig { break-inside: avoid; margin: 8pt 0 14pt; }
.tbl.split { break-inside: auto; }
.lab { font-weight: 700; line-height: 1.5; break-after: avoid; }
.ttl { font-style: italic; line-height: 1.5; margin-bottom: 6pt; break-after: avoid; }
.note { font-size: 10pt; line-height: 1.35; margin-top: 5pt; }
table.apa { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.3; }
table.apa th { text-align: left; font-weight: 700; padding: 4pt 7pt; border-top: 1px solid #000; border-bottom: 1px solid #000; vertical-align: bottom; }
table.apa td { padding: 3.5pt 7pt; vertical-align: top; }
table.apa tbody tr:last-child td { border-bottom: 1px solid #000; }
table.apa tr { break-inside: avoid; }
.fig svg { display: block; margin: 0 auto; max-width: 100%; }
p.ref { padding-left: .5in; text-indent: -.5in; }
`;

function html(tocPages = {}) {
  const content = ref(body.join('\n'));
  const tocHtml = toc.map((e) => `<div class="toc-row l${e.level}"><span class="lbl">${e.text}</span><span class="dots"></span><span class="pg">${tocPages[e.id] ?? ''}</span></div>`).join('');
  const videoLine = VIDEO ? `<a href="${VIDEO}">${VIDEO}</a>` : '[enlace por agregar al publicar el video]';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${TITLE}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>
<section class="cover">
<div class="t">${TITLE}</div>
<div>David Ricardo Amaya Rojas</div>
<div>Tecnológica del Oriente</div>
<div>Arquitectura de Software 20262 - N6 Gr A</div>
<div>Unidad 3 · Actividad 6: Navegando mareas: estrategias de navegación en la arquitectura de software</div>
<div>Leydi Johana Polo Amador</div>
<div>19 de noviembre de 2026</div>
<div>Video de presentación: ${videoLine}</div>
<div>Código fuente: <a href="${REPO}">${REPO}</a></div>
</section>
<section class="toc"><div class="toc-h">Tabla de contenido</div>${tocHtml}</section>
${content}
</body></html>`;
}
const render = (outHtml, outPdf) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${outPdf}`, `file://${outHtml}`], { stdio: 'ignore' });
function pageTexts(pdf) {
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())[1]);
  return Array.from({ length: n }, (_, i) => execFileSync('pdftotext', ['-layout', '-f', String(i + 1), '-l', String(i + 1), pdf, '-']).toString());
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
let pages = {};
for (let pass = 1; pass <= 3; pass++) {
  writeFileSync(dir + 'informe.html', html(pages));
  render(dir + 'informe.html', dir + 'informe.pdf');
  const texts = pageTexts(dir + 'informe.pdf');
  const found = {};
  let from = 2;
  for (const e of toc) {
    const idx = texts.findIndex((t, i) => i >= from && t.split('\n').some((l) => norm(l) === norm(e.text)));
    found[e.id] = idx >= 0 ? idx + 1 : '?';
    if (idx >= 0) from = idx;
  }
  const same = JSON.stringify(found) === JSON.stringify(pages);
  pages = found;
  console.log(`pasada ${pass}: ${texts.length} páginas, índice ${same ? 'estable' : 'actualizado'}`);
  if (same) break;
}
const missing = toc.filter((e) => pages[e.id] === '?');
if (missing.length) console.warn('Encabezados sin hallar:', missing.map((m) => m.text));
