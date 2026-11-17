import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, root), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(await compile('src/data/chronoData.ts')).toString('base64');
const exportCode = (await compile('src/lib/exportCard.ts')).replace("'../data/chronoData'", JSON.stringify(dataUrl));
const { exportCard } = await import('data:text/javascript;base64,' + Buffer.from(exportCode).toString('base64'));
const { nodes } = await import(dataUrl);
const labels = []; const downloads = []; const boxes = [];
const context = new Proxy({ measureText: text => ({ width: Array.from(text).length * 29 }), fillText: (text, x, y) => { labels.push(text); boxes.push([x, y]); }, createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, val) => { target[key] = val; return true; } });
let currentCanvas;
globalThis.document = { fonts: { ready: Promise.resolve() }, body: { appendChild() {} }, createElement: tag => {
 if (tag === 'canvas') { currentCanvas = { width: 0, height: 0, getContext: () => context, toBlob: cb => cb(new Blob(['png-test'], { type: 'image/png' })) }; return currentCanvas; }
 return { style: {}, click() { downloads.push(this.download); }, remove() {} };
} };
globalThis.window = { setTimeout: cb => { cb(); return 0; } };
const node = nodes.find(n => n.id === 'newton'); const comparison = nodes.find(n => n.id === node.comparisonId);
for (const active of [false, true]) for (const mode of ['removed', 'delayed']) {
 labels.length = 0; boxes.length = 0;
 await exportCard(node, comparison, mode, active);
 assert.equal(currentCanvas.width, 1600); assert(currentCanvas.height >= 2100);
 assert(labels.includes('ChronoWeave 时空推演手札'));
 for (const dim of ['基础科学', '工程技术', '信息传播', '社会组织', '全球化连接']) assert(labels.includes(dim));
 assert(boxes.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && y < currentCanvas.height - 80));
 assert(labels.some(t => t.includes(active ? '已启用假设' : '预览假设')));
 assert(downloads.at(-1) === `ChronoWeave-newton-${mode}.png`);
}
console.log(JSON.stringify({ status: 'PASS', cases: 4, width: currentCanvas.width, height: currentCanvas.height, checks: ['canvas composition with fixture', 'five named dimensions', 'text vertical bounds', 'four scenario states', 'download filename'], note: 'Fixture checks composition only; actual PNG encoding requires browser verification.' }, null, 2));
