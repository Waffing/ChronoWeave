import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, root), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(await compile('src/data/chronoData.ts')).toString('base64');
const simCode = (await compile('src/lib/simulation.ts')).replace("'../data/chronoData'", JSON.stringify(dataUrl));
const { impactLevels, scenario } = await import('data:text/javascript;base64,' + Buffer.from(simCode).toString('base64'));
const { nodes } = await import(dataUrl);
for (const n of nodes) {
  const levels = impactLevels(n.id); assert.equal(levels.get(n.id), 0);
  for (const id of n.downstream) assert(levels.has(id));
  const removed = scenario(n, 'removed'); const delayed = scenario(n, 'delayed');
  assert.deepEqual(removed.scores, n.whatIf.alternate); assert.equal(removed.delay, n.whatIf.delay);
  assert.equal(delayed.delay, Math.round(n.whatIf.delay * .65));
  delayed.scores.forEach((score, i) => assert.equal(score, Math.round(n.whatIf.baseline[i] - (n.whatIf.baseline[i] - n.whatIf.alternate[i]) * .65)));
}
const storageCode = await compile('src/lib/storage.ts');
const { loadState, saveState, initialState } = await import('data:text/javascript;base64,' + Buffer.from(storageCode).toString('base64'));
let value = null;
globalThis.localStorage = { getItem: () => value, setItem: (_, v) => { value = v; } };
assert.deepEqual(loadState(), initialState); assert(saveState({ ...initialState, muted: true })); assert.equal(loadState().muted, true);
value = '{bad'; assert.deepEqual(loadState(), initialState);
value = JSON.stringify({ records: [null, {}, { id: 'x', nodeId: 'newton', mode: 'removed', date: '2026-11-17' }] }); assert.equal(loadState().records.length, 1);
globalThis.localStorage.setItem = () => { throw new Error('blocked'); }; assert.equal(saveState(initialState), false);
const files = await fs.readdir(new URL('src/', root), { recursive: true });
for (const file of files.filter(f => /\.(tsx?|css)$/.test(f))) {
 const content = await fs.readFile(new URL('src/' + file.replaceAll('\\', '/'), root), 'utf8');
 assert(!/https?:\/\//.test(content), `Unexpected external URL: ${file}`);
}
console.log(JSON.stringify({ status: 'PASS', checkedNodes: nodes.length, checks: ['recursive causal propagation', 'removed scenario', 'delayed scenario rounding', 'storage roundtrip', 'corrupted storage recovery', 'invalid record filtering', 'blocked storage detection', 'no external source resource URLs'] }, null, 2));
