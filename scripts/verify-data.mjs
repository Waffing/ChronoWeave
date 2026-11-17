import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Native Node 24 type stripping: no build, installation, temporary files, or cwd dependency.
const sourceUrl = new URL('../src/data/chronoData.ts', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const javascript = stripTypeScriptTypes(source, { mode: 'strip' });
const { eras, nodes, categories, formatYear } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);
const text = (value, label) => {
  assert.equal(typeof value, 'string', `${label}: 必须为字符串`);
  assert.ok(value.trim().length > 0, `${label}: 不得为空`);
  assert.ok(!/TODO|TBD|待补充|占位文本|示例内容/i.test(value), `${label}: 不得为占位内容`);
};
const integer = (value, label) => assert.ok(Number.isInteger(value), `${label}: 必须为整数`);
const categoryIds = ['science', 'engineering', 'thought', 'society'];
assert.ok(Array.isArray(eras));
assert.deepEqual(eras.map(era => era.id), ['axial', 'song', 'revolution', 'modern']);
const eraMap = new Map(eras.map(era => [era.id, era]));
for (const era of eras) {
  for (const key of ['id', 'title', 'subtitle', 'range']) text(era[key], `${era.id}.${key}`);
  integer(era.start, `${era.id}.start`);
  integer(era.end, `${era.id}.end`);
  assert.ok(era.start < era.end);
}
assert.deepEqual(categories.map(category => category.id), ['all', ...categoryIds]);
assert.deepEqual(categories.map(category => category.label), ['全部', '科学数学', '技术工程', '哲学思想', '社会制度']);
assert.equal(formatYear(-256), '公元前256年');
assert.equal(formatYear(1905), '公元1905年');
assert.ok(Array.isArray(nodes) && nodes.length >= 32, '至少32个节点');
const nodeMap = new Map(nodes.map(node => [node.id, node]));
assert.equal(nodeMap.size, nodes.length, '节点ID必须唯一');
const uniqueContent = new Map(
  ['breakthrough', 'significance', 'comparison', 'direct', 'cross', 'modern', 'uncertainty'].map(key => [key, new Set()])
);
function dedicated(key, value, id) {
  text(value, `${id}.${key}`);
  const normalized = value.replace(/[\s\p{P}\p{S}]/gu, '');
  assert.ok(!uniqueContent.get(key).has(normalized), `${id}.${key}: 专属内容不得重复`);
  uniqueContent.get(key).add(normalized);
}
for (const node of nodes) {
  for (const key of ['id', 'eraId', 'title', 'location', 'comparisonId']) text(node[key], `${node.id}.${key}`);
  const era = eraMap.get(node.eraId);
  assert.ok(era, `${node.id}: 时代必须存在`);
  integer(node.year, `${node.id}.year`);
  assert.notEqual(node.year, 0, `${node.id}: 历史纪年无公元0年`);
  if (node.endYear !== undefined) {
    integer(node.endYear, `${node.id}.endYear`);
    assert.ok(node.endYear >= node.year, `${node.id}: 结束年份不得早于起点`);
  }
  if (node.extended !== undefined) assert.equal(typeof node.extended, 'boolean');
  const outside = node.year < era.start || (node.endYear ?? node.year) > era.end;
  assert.equal(node.extended === true, outside, `${node.id}: 超出时代范围必须准确标记extended`);
  assert.ok(['east', 'west'].includes(node.side));
  assert.ok(categoryIds.includes(node.category));
  assert.ok(Array.isArray(node.coordinates) && node.coordinates.length === 2);
  const [longitude, latitude] = node.coordinates;
  assert.ok(Number.isFinite(longitude) && Math.abs(longitude) <= 180);
  assert.ok(Number.isFinite(latitude) && Math.abs(latitude) <= 90);
  for (const key of ['breakthrough', 'significance', 'comparison']) dedicated(key, node[key], node.id);
  const comparison = nodeMap.get(node.comparisonId);
  assert.ok(comparison, `${node.id}: 比较对象必须存在`);
  assert.notEqual(comparison.side, node.side, `${node.id}: 比较必须异侧`);
  assert.ok(Array.isArray(node.sources) && node.sources.length > 0, `${node.id}: 必须有史料`);
  for (const [index, citation] of node.sources.entries()) {
    text(citation.title, `${node.id}.sources[${index}].title`);
    text(citation.note, `${node.id}.sources[${index}].note`);
    assert.ok(!/https?:\/\//i.test(citation.title + citation.note), '史料使用书名或论文题名，不虚构URL');
  }
  for (const direction of ['upstream', 'downstream']) {
    const edges = node[direction];
    assert.ok(Array.isArray(edges), `${node.id}.${direction}: 必须为数组`);
    assert.equal(new Set(edges).size, edges.length, `${node.id}: 不得有重复边`);
    for (const id of edges) {
      text(id, `${node.id}.${direction}`);
      const other = nodeMap.get(id);
      assert.ok(other && id !== node.id, `${node.id}: 链接必须有效且不自指`);
      const reverse = direction === 'upstream' ? 'downstream' : 'upstream';
      assert.ok(other[reverse].includes(node.id), `${node.id}与${id}: 上下游必须一致`);
      if (direction === 'downstream') assert.ok(node.year <= other.year, `${node.id}→${id}: 不得逆时序`);
    }
  }
  assert.ok(node.whatIf && typeof node.whatIf === 'object', `${node.id}: 缺少反事实`);
  const scenario = node.whatIf;
  for (const key of ['direct', 'cross', 'modern', 'uncertainty']) dedicated(key, scenario[key], node.id);
  const threeLayers = ['direct', 'cross', 'modern'].map(key => scenario[key]);
  assert.equal(new Set(threeLayers).size, 3, `${node.id}: 三层推演不得相同`);
  for (const value of threeLayers) assert.ok(value.startsWith('推测：'), `${node.id}: 必须明确标注推测`);
  assert.match(scenario.uncertainty, /雷达|五维|教学/, `${node.id}: 应说明教学数值边界`);
  for (const key of ['baseline', 'alternate']) {
    const values = scenario[key];
    assert.ok(Array.isArray(values) && values.length === 5, `${node.id}.${key}: 必须五维`);
    for (const value of values) assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, `${node.id}.${key}: 数值范围0—100`);
  }
  assert.notDeepEqual(scenario.baseline, scenario.alternate, `${node.id}: 情境必须有维度变化`);
  assert.ok(Number.isFinite(scenario.delay) && scenario.delay >= 0, `${node.id}: 延迟必须为非负有限数`);
}
for (const era of eras) {
  const members = nodes.filter(node => node.eraId === era.id);
  assert.ok(members.length >= 8, `${era.id}: 每时代至少8节点`);
  for (const side of ['east', 'west']) assert.ok(members.some(node => node.side === side));
}
// Three-color DFS detects cycles even when reciprocal arrays happen to be consistent.
const colors = new Map();
function visit(id, path = []) {
  assert.notEqual(colors.get(id), 'gray', `发现环: ${[...path, id].join(' → ')}`);
  if (colors.get(id) === 'black') return;
  colors.set(id, 'gray');
  for (const next of nodeMap.get(id).downstream) visit(next, [...path, id]);
  colors.set(id, 'black');
}
for (const node of nodes) visit(node.id);
assert.ok(nodes.some(node => node.downstream.some(id => nodeMap.get(id).eraId !== node.eraId)), '至少包含跨时代链');
// Mandatory subjects, stable integration IDs, and chronology guardrails.
const required = {
  confucius: -500, laozi: -350, mozi: -400, dujiangyan: -256,
  pythagoras: -530, socrates: -399, plato: -387, euclid: -300, archimedes: -250,
  bisheng: 1041, supernova1054: 1054, shenkuo: 1088, susong: 1092,
  schism1054: 1054, norman1066: 1066, bologna: 1088, crusade1096: 1096,
  songyingxing: 1637, xuxiake: 1636, calendartrial: 1664, wangfuzhi: 1687,
  descartes: 1637, newton: 1666, londonfire: 1666, leibniz: 1703,
  abolition1905: 1905, jingzhang: 1905, newschools: 1904, overseasstudy: 1872,
  einstein: 1905, planck: 1900, wright: 1903, rutherford: 1911,
};
for (const [id, year] of Object.entries(required)) assert.equal(nodeMap.get(id)?.year, year, `${id}: 覆盖与年代检查`);
const binary = nodeMap.get('leibniz').breakthrough;
assert.match(binary, /1679/);
assert.match(binary, /1701/);
assert.match(binary, /不能说/);
console.log(`数据校验通过：${nodes.length}节点；${eras.map(era => `${era.id}=${nodes.filter(node => node.eraId === era.id).length}`).join('，')}；字段、比较、双向链接、无环、五维、专属反事实及年代检查全部通过。`);
