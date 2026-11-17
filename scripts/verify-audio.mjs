import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
const code = ts.transpileModule(await fs.readFile(new URL('../src/lib/audio.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const source = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
let constructors = 0, starts = 0;
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
class FakeContext { constructor() { constructors++; } state = 'running'; currentTime = 1; destination = {}; createOscillator() { return { frequency: param(), connect() {}, disconnect() {}, start() { starts++; }, stop() {} }; } createGain() { return { gain: param(), connect() {}, disconnect() {} }; } createBiquadFilter() { return { frequency: param(), connect() {}, disconnect() {} }; } }
globalThis.window = { AudioContext: FakeContext };
const { playSound } = await import(source);
playSound('tick', false); assert.equal(constructors, 0);
playSound('tick', true); assert.equal(constructors, 1); assert.equal(starts, 2);
playSound('rotate', true); const before = starts; playSound('rotate', true); assert.equal(starts, before);
playSound('fold', true); assert.equal(starts, before + 2); assert.equal(constructors, 1);
globalThis.window = {};
const noAudio = await import(source + '#unsupported'); assert.doesNotThrow(() => noAudio.playSound('tick', true));
globalThis.window = { AudioContext: class { constructor() { throw new Error('blocked'); } } };
const blocked = await import(source + '#blocked'); assert.doesNotThrow(() => blocked.playSound('fold', true));
console.log(JSON.stringify({ status: 'PASS', checks: ['muted does not construct AudioContext', 'lazy singleton context', 'two-oscillator synthesis', 'rotation throttling', 'fold synthesis', 'unsupported browser safety', 'construction blocked safety'], note: 'Fixture verifies scheduling and safety, not perceived sound quality.' }, null, 2));
