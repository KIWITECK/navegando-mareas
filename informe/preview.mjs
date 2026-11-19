import * as F from './figuras.mjs';
import { writeFileSync } from 'node:fs';
const body = ['fig1','fig2','fig3','fig4','fig5','fig6'].map((k) => `<h4 style="font:12px Arial">${k}</h4><div style="width:624px;border:1px dashed #ddd;margin-bottom:12px">${F[k]()}</div>`).join('');
writeFileSync(process.argv[2], `<!doctype html><meta charset="utf-8"><body style="margin:16px">${body}</body>`);
