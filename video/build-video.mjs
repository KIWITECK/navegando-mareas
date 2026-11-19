// Genera el proyecto HyperFrames (hf/): cada escena es una diapositiva; el PDF de diapositivas sale de sus fotogramas finales.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { escenas } from './escenas.mjs';
import * as F from '../informe/figuras.mjs';

const here = new URL('.', import.meta.url).pathname;
const manifest = existsSync(here + 'audio/manifest.json') ? JSON.parse(readFileSync(here + 'audio/manifest.json')) : {};
const EXP = JSON.parse(readFileSync(here + '../docs/exploracion.json'));
const demoTxt = readFileSync(here + 'assets/demo.txt', 'utf8').split('\n').filter(Boolean);
const testsTxt = readFileSync(here + 'assets/tests.txt', 'utf8').split('\n').filter(Boolean);
const GAP = 0.3, LEAD = 0.6, TAIL = 0.8, FADE = 0.4;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let cursor = 0;
const sched = escenas.map((sc) => {
  const durs = sc.chunks.map((c, i) => manifest[`${sc.id}-${i}`]?.dur ?? Math.max(3, c.tts.split(/\s+/).length / 3.1));
  let t = LEAD;
  const times = durs.map((d) => { const s = t; t += d + GAP; return s; });
  const dur = t - GAP + TAIL + (sc.id === 'conclusiones' ? 3 : 0);
  const out = { ...sc, start: cursor, dur, durs, times };
  cursor += dur;
  return out;
});
const TOTAL = cursor;
writeFileSync(here + 'audio/schedule.json', JSON.stringify(sched.map((s) => ({ id: s.id, start: s.start, times: s.times, durs: s.durs, dur: s.dur })), null, 1));

const CSS = `
  #root { position: absolute; inset: 0; background: #FFFFFF; font-family: Inter, sans-serif; color: #000; overflow: hidden; }
  .wrap { position: absolute; inset: 0; }
  .ttl { position: absolute; left: 120px; top: 54px; font-size: 48px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .abs { position: absolute; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .panel { background: #F7F7F8; border: 1.5px solid #D5D6DB; border-radius: 16px; }
`;
const fadeJS = (id, dur, first) => `
  ${first ? '' : `tl.fromTo('#${id}-wrap', { opacity: 0 }, { opacity: 1, duration: ${FADE}, ease: 'power2.out' }, 0);`}
  tl.fromTo('#${id}-ttl', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 0.15);
  tl.to('#${id}-wrap', { opacity: 0, duration: ${FADE}, ease: 'power2.in' }, ${(dur - FADE).toFixed(3)});`;
function revealJS(sc, present) {
  const cues = sc.chunks.map((c, i) => ({ t: sc.times[i], parts: c.show.filter((p) => present.has(p)) }));
  return `
  const root = '#${sc.id}-wrap';
  tl.set(root + ' [data-part]', { opacity: 0 }, 0);
  const cues = ${JSON.stringify(cues)};
  cues.forEach((c) => c.parts.forEach((p, i) => {
    tl.fromTo(root + ' [data-part="' + p + '"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, c.t + i * 0.2);
  }));`;
}
function figureBody(sc) {
  let s = F[sc.fig]();
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(s);
  const [w, h] = [Number(m[1]), Number(m[2])];
  const [y0, y1] = sc.crop ?? [0, h];
  const ch = y1 - y0;
  s = s.replace(/viewBox="[^"]+"/, `viewBox="0 ${y0} ${w} ${ch}"`).replace(/ width="100%"/, '').replace(/(f\d+v?)ar/g, `${sc.id}-ar`);
  const width = Math.min(1680, Math.floor((860 * w) / ch));
  const left = Math.round((1920 - width) / 2);
  return `<div class="abs" style="left:${left}px; top:170px; width:${width}px">${s.replace('<svg ', `<svg width="${width}" `)}</div>`;
}
const BATCHES = 48;
function exploreBody() {
  const S = EXP.size, cell = 9;
  const colors = { dijkstra: '#EBA783', bidirectional: '#AE9BD9', astar: '#8DB7DD' };
  const label = { dijkstra: 'Dijkstra', bidirectional: 'Bidireccional', astar: 'A*' };
  const order = ['dijkstra', 'bidirectional', 'astar'];
  return order.map((k, i) => {
    const e = EXP.estrategias[k], x0 = 120 + i * 585, y0 = 290, per = Math.ceil(e.visitados.length / BATCHES);
    let groups = '';
    for (let b = 0; b < BATCHES; b++) {
      const rects = e.visitados.slice(b * per, (b + 1) * per).map((v) => `<rect x="${(v % S) * cell}" y="${Math.floor(v / S) * cell}" width="${cell + 0.3}" height="${cell + 0.3}" fill="${colors[k]}" fill-opacity="0.65"/>`).join('');
      if (rects) groups += `<g class="b-${k}" data-b="${b}" opacity="0">${rects}</g>`;
    }
    const pts = e.ruta.map((v) => `${(v % S) * cell + cell / 2},${Math.floor(v / S) * cell + cell / 2}`).join(' ');
    const pt = (v, f) => `<circle cx="${(v % S) * cell + cell / 2}" cy="${Math.floor(v / S) * cell + cell / 2}" r="7" fill="${f}" stroke="#000" stroke-width="2"/>`;
    return `<div class="abs" data-part="p-${k}" style="left:${x0}px; top:150px; width:540px">
      <div style="font-size:38px; font-weight:700">${label[k]}</div>
    </div>
    <svg class="abs" data-part="g-${k}" style="left:${x0}px; top:${y0}px" width="540" height="540" viewBox="0 0 540 540"><rect width="540" height="540" fill="#fff" stroke="#9A9DA6" stroke-width="1.5"/>${groups}<polyline class="r-${k}" points="${pts}" fill="none" stroke="#000" stroke-width="3" opacity="0"/>${pt(EXP.from, '#fff')}${pt(EXP.to, '#000')}</svg>
    <div class="abs" data-part="n-${k}" style="left:${x0}px; top:845px; width:540px; font-size:32px; line-height:1.3"><b>${e.expandidos.toLocaleString('es-CO')} nodos</b><br/>costo de la ruta ${String(e.costo).replace('.', ',')}</div>`;
  }).join('\n');
}
function kindBody(sc) {
  switch (sc.kind) {
    case 'cover': return `
    <div class="abs" data-part="title" style="left:120px; top:200px; width:1560px">
      <div style="font-size:88px; font-weight:800; letter-spacing:-0.04em; line-height:1.05">Navegación eficiente de rutas con tráfico dinámico</div>
      <div style="font-size:46px; font-weight:500; margin-top:28px; line-height:1.25; width:1400px">Navegando mareas: estrategias de navegación en la arquitectura de software</div>
    </div>
    <div class="abs" data-part="meta" style="left:120px; top:640px; font-size:32px; line-height:1.55; width:1500px">
      <div style="font-weight:700">David Ricardo Amaya Rojas</div>
      <div>Tecnológica del Oriente · Arquitectura de Software 20262 - N6 Gr A</div>
      <div>Unidad 3 · Actividad 6 · Docente: Leydi Johana Polo Amador</div>
      <div>19 de noviembre de 2026</div>
    </div>`;
    case 'fig': return figureBody(sc);
    case 'explore': return exploreBody();
    case 'statements': return sc.items.map((it, i) => `<div class="abs" data-part="${it.part}" style="left:120px; top:${sc.top + i * sc.step}px; width:1680px; font-size:${it.size}px; font-weight:500; letter-spacing:-0.01em; line-height:1.25">${it.html}</div>`).join('\n');
    case 'rows': {
      const ws = sc.widths, size = sc.rowSize ?? 32;
      const head = `<div class="abs" data-part="head" style="left:120px; top:${sc.headTop ?? 175}px; width:1680px; display:flex; font-size:26px; font-weight:700">${sc.head.map((h, i) => `<div style="width:${ws[i]}px">${esc(h)}</div>`).join('')}</div>`;
      const rows = sc.rows.map((r, i) => `<div class="abs" data-part="${r.part}" style="left:120px; top:${sc.rowTop + i * sc.rowH}px; width:1680px; display:flex; align-items:center; font-size:${size}px; line-height:1.25">${r.cols.map((c, j) => `<div style="width:${ws[j]}px; padding-right:28px">${c}</div>`).join('')}</div>`).join('\n');
      const note = sc.extraNote ? `<div class="abs" data-part="r3" style="left:120px; top:${sc.rowTop + sc.rows.length * sc.rowH + 30}px; width:1680px; font-size:30px; font-weight:500">${esc(sc.extraNote)}</div>` : '';
      return head + rows + note;
    }
    case 'term': {
      const lh = 34;
      const demo = demoTxt.map(esc).join('\n');
      const tests = testsTxt.slice(0, 11).map((l) => esc(l).replace(/^✔/, '✔')).join('\n') + '\n…\nℹ 16 pruebas · 16 pasan · 0 fallan';
      return `
    <div class="abs" data-part="head" style="left:120px; top:140px; font-size:34px; font-weight:500">JavaScript · Node.js 25 · sin dependencias · un módulo por pieza de la arquitectura</div>
    <div class="abs panel" data-part="demo-cmd" style="left:120px; top:210px; width:1680px; height:310px"></div>
    <div class="abs mono" data-part="demo-cmd" style="left:150px; top:225px; font-size:26px; line-height:${lh}px; font-weight:700">$ npm run demo</div>
    <div class="abs mono" data-part="demo-out" style="left:150px; top:${225 + lh}px; width:1620px; font-size:25px; line-height:${lh}px; white-space:pre-wrap">${demo}</div>
    <div class="abs panel" data-part="test-cmd" style="left:120px; top:545px; width:1680px; height:480px"></div>
    <div class="abs mono" data-part="test-cmd" style="left:150px; top:560px; font-size:26px; line-height:${lh}px; font-weight:700">$ npm test</div>
    <div class="abs mono" data-part="test-out" style="left:150px; top:${560 + lh}px; width:1620px; font-size:23px; line-height:31px; white-space:pre">${tests}</div>`;
    }
  }
  return '';
}
function exploreJS(sc) {
  const t = sc.times, durs = sc.durs;
  const lines = [];
  const anim = (k, start, dur) => `
    (function(){ const els = document.querySelectorAll('#${sc.id}-wrap .b-${k}'); const n = els.length;
      els.forEach((el, i) => tl.to(el, { opacity: 1, duration: ${(dur).toFixed(3)} / n, ease: 'none' }, ${start.toFixed(3)} + i * ${(dur).toFixed(3)} / n));
      tl.to('#${sc.id}-wrap .r-${k}', { opacity: 1, duration: 0.5 }, ${(start + dur).toFixed(3)}); })();`;
  lines.push(`tl.fromTo('#${sc.id}-wrap [data-part^="p-"], #${sc.id}-wrap [data-part^="g-"]', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.1 }, ${t[0].toFixed(3)});`);
  lines.push(`tl.fromTo('#${sc.id}-wrap [data-part="n-dijkstra"], #${sc.id}-wrap [data-part="n-bidirectional"]', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${(t[1] + durs[1] - 1).toFixed(3)});`);
  lines.push(`tl.fromTo('#${sc.id}-wrap [data-part="n-astar"]', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${(t[2] + durs[2] * 0.45).toFixed(3)});`);
  lines.push(anim('dijkstra', t[1], durs[1] * 0.95) + anim('bidirectional', t[1], durs[1] * 0.95) + anim('astar', t[2], durs[2] * 0.25));
  return lines.join('\n');
}
function sceneFile(sc) {
  const body = kindBody(sc);
  const present = new Set([...body.matchAll(/data-part="([^"]+)"/g)].map((m) => m[1]));
  const showTitle = sc.title && sc.kind !== 'cover';
  const extra = sc.kind === 'cover' ? `tl.set('#${sc.id}-wrap [data-part="title"]', { opacity: 1, y: 0 }, 0.001);` : '';
  const reveal = sc.kind === 'explore'
    ? `tl.set('#${sc.id}-wrap [data-part]', { opacity: 0 }, 0);\n${exploreJS(sc)}`
    : revealJS(sc, present);
  return `<template>
  <style>${CSS}</style>
  <div id="root" data-composition-id="${sc.id}" data-width="1920" data-height="1080">
    <div class="wrap" id="${sc.id}-wrap">
     <div class="wrap" id="${sc.id}-zoom">
      ${showTitle ? `<div class="ttl" id="${sc.id}-ttl">${esc(sc.title)}</div>` : `<div class="ttl" id="${sc.id}-ttl" style="opacity:0"></div>`}
      ${body}
     </div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${fadeJS(sc.id, sc.dur, sc.kind === 'cover')}
    ${reveal}
    tl.fromTo('#${sc.id}-zoom', { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.02, duration: ${sc.dur.toFixed(2)}, ease: 'none' }, 0);
    ${extra}
    window.__timelines["${sc.id}"] = tl;
  </script>
</template>
`;
}
mkdirSync(here + 'hf/compositions', { recursive: true });
mkdirSync(here + 'hf/assets', { recursive: true });
for (const sc of sched) writeFileSync(`${here}hf/compositions/${sc.id}.html`, sceneFile(sc));
const hosts = sched.map((sc) => `      <div id="${sc.id}" class="clip" data-composition-id="${sc.id}" data-composition-src="compositions/${sc.id}.html" data-start="${sc.start.toFixed(3)}" data-duration="${sc.dur.toFixed(3)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join('\n');
writeFileSync(here + 'hf/index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Navegando mareas</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #ffffff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL.toFixed(3)}" data-width="1920" data-height="1080">
${hosts}
      <audio id="narration" class="clip" src="assets/narration.wav" data-start="0" data-duration="${TOTAL.toFixed(3)}" data-track-index="0" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
console.log(`diapositivas: ${sched.length}, duración total ${(TOTAL / 60).toFixed(2)} min (${TOTAL.toFixed(1)} s)`);
