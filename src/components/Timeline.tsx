import { type ChronoNode, formatYear } from '../data/chronoData';
export function Timeline({ nodes, selected, onSelect, impacts }: { nodes: ChronoNode[]; selected: string; onSelect: (id: string) => void; impacts: Map<string, number> }) {
  const years = [...new Set(nodes.map(n => n.year))].sort((a, b) => a - b);
  return <div className="timeline"><div className="timeline-head"><span>东方文明 / EAST</span><span>西方文明 / WEST</span></div>{years.map(year => <div className="time-row" key={year}>
    {(['east', 'west'] as const).map(side => <div className={`time-side ${side}`} key={side}>{nodes.filter(n => n.year === year && n.side === side).map(n => <button key={n.id} data-node={n.id} className={`time-node ${selected === n.id ? 'selected' : ''} ${impacts.has(n.id) ? 'impacted' : ''}`} onClick={() => onSelect(n.id)}><small>{n.location}{n.extended ? ' · 邻近延展' : ''}</small><strong>{n.title}</strong><p>{n.breakthrough}</p><span>{nodes.some(other => other.id === n.comparisonId) ? '↔ 共时对照已映射 · ' : ''}查看档案 ↗</span></button>)}</div>)}
    <span className="time-year">{formatYear(year)}</span><span className="time-bridge"/>{nodes.filter(n => n.year === year).some(n => nodes.some(other => other.id === n.comparisonId)) && <span className="bridge-mark" aria-label="此年代存在跨文明对照">◇</span>}
  </div>)}</div>;
}
