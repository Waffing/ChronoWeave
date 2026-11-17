import { nodes, type ChronoNode } from '../data/chronoData';
export type Mode = 'removed' | 'delayed';
export function impactLevels(id: string) {
  const levels = new Map<string, number>([[id, 0]]);
  const queue = [id];
  for (let i = 0; i < queue.length; i++) {
    const node = nodes.find(n => n.id === queue[i]);
    for (const next of node?.downstream ?? []) {
      if (!levels.has(next)) { levels.set(next, levels.get(queue[i])! + 1); queue.push(next); }
    }
  }
  return levels;
}
export function scenario(node: ChronoNode, mode: Mode) {
  const factor = mode === 'removed' ? 1 : .65;
  return { scores: node.whatIf.baseline.map((v, i) => Math.round(v - (v - node.whatIf.alternate[i]) * factor)), delay: Math.round(node.whatIf.delay * factor) };
}
