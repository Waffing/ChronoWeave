import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Minus, Plus } from 'lucide-react';
import { type ChronoNode, type Era, formatYear } from '../data/chronoData';
import { playSound } from '../lib/audio';
interface Props { nodes: ChronoNode[]; era: Era; selected: string; onSelect: (id: string) => void; impacts: Map<string, number>; muted: boolean }
const center = 350;
export function Astrolabe({ nodes, era, selected, onSelect, impacts, muted }: Props) {
  const [rotation, setRotation] = useState(0); const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => { const svg = svgRef.current; if (!svg) return; const wheel = (e: WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(1.45, Math.max(.7, z - e.deltaY * .001))); }; svg.addEventListener('wheel', wheel, { passive: false }); return () => svg.removeEventListener('wheel', wheel); }, []);
  const drag = useRef<{ start: number; rotation: number; moved: boolean } | null>(null);
  const angle = (x: number, y: number, rect: DOMRect) => Math.atan2(y - rect.top - rect.height / 2, x - rect.left - rect.width / 2) * 180 / Math.PI;
  const allYears = nodes.map(n => n.year); const min = Math.min(era.start, ...allYears); const max = Math.max(era.end, ...allYears);
  const positions = new Map(nodes.map(n => { const peers = nodes.filter(p => p.side === n.side && Math.abs(p.year - n.year) < 3); const separation = (peers.findIndex(p => p.id === n.id) - (peers.length - 1) / 2) * 18; const a = (-150 + (n.year - min) / Math.max(1, max - min) * 270 + separation + rotation) * Math.PI / 180; const r = n.side === 'east' ? 184 : 268; return [n.id, { x: center + Math.cos(a) * r, y: center + Math.sin(a) * r, a }]; }));
  const edges: { from: string; to: string; causal: boolean }[] = [];
  const edgeSet = new Set<string>();
  for (const n of nodes) {
    for (const id of [...n.downstream, n.comparisonId]) {
      if (!positions.has(id)) continue;
      const key = [n.id, id].sort().join(':');
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ from: n.id, to: id, causal: n.downstream.includes(id) }); }
    }
  }
  return <div className="astrolabe-wrap">
    <div className="cardinal north">N · 北</div><div className="cardinal south">S · 南</div>
    <svg ref={svgRef} className="astrolabe" viewBox="0 0 700 700" aria-label="可交互双环文明星盘"
      onPointerDown={e => { if ((e.target as Element).closest('[data-node]')) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { start: angle(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()), rotation, moved: false }; }}
      onPointerMove={e => { if (!drag.current) return; const delta = angle(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()) - drag.current.start; if (Math.abs(delta) > 1) drag.current.moved = true; setRotation(drag.current.rotation + delta); playSound('rotate', !muted); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <defs><radialGradient id="dialGlow"><stop stopColor="#17354a" stopOpacity=".24"/><stop offset="1" stopColor="#080b11" stopOpacity="0"/></radialGradient><linearGradient id="bridge"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#d4af37"/></linearGradient><filter id="nodeGlow"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <circle cx="350" cy="350" r="340" fill="url(#dialGlow)"/>
      <g transform={`translate(350 350) scale(${zoom}) translate(-350 -350)`}>
        {[92, 118, 150, 184, 224, 268, 294, 314, 327].map((r, i) => <circle key={r} cx="350" cy="350" r={r} fill="none" stroke={i === 3 ? '#38bdf8' : '#d4af37'} strokeOpacity={i === 3 || i === 5 ? '.45' : '.12'} strokeDasharray={i === 2 || i === 4 ? '2 8' : undefined} />)}
        <g transform={`rotate(${rotation} 350 350)`}>{Array.from({ length: 120 }, (_, i) => { const a = i * 3 * Math.PI / 180; const r = i % 5 === 0 ? 300 : 307; return <line key={i} x1={350 + Math.cos(a) * r} y1={350 + Math.sin(a) * r} x2={350 + Math.cos(a) * 315} y2={350 + Math.sin(a) * 315} stroke="#d4af37" strokeOpacity={i % 5 === 0 ? '.6' : '.25'} />; })}</g>
        {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 + rotation) * Math.PI / 180; return <g key={i}><line x1={350 + Math.cos(a) * 100} y1={350 + Math.sin(a) * 100} x2={350 + Math.cos(a) * 291} y2={350 + Math.sin(a) * 291} stroke="#9bacc1" strokeOpacity=".07"/><text x={350 + Math.cos(a) * 338} y={354 + Math.sin(a) * 338} fill="#8e7950" fontSize="9" textAnchor="middle" fontFamily="monospace">{String(i * 30).padStart(3, '0')}°</text></g>; })}
        {edges.map(edge => { const a = positions.get(edge.from)!; const b = positions.get(edge.to)!; const red = impacts.has(edge.from) && impacts.has(edge.to); const lit = edge.from === selected || edge.to === selected; return <path key={`${edge.from}-${edge.to}`} d={`M ${a.x} ${a.y} Q 350 350 ${b.x} ${b.y}`} fill="none" stroke={red ? '#f43f5e' : 'url(#bridge)'} strokeWidth={lit || red ? 1.5 : .7} opacity={lit || red ? .85 : .18} data-link-kind={edge.causal ? 'causal' : 'comparison'} strokeDasharray={edge.causal ? '5 7' : '2 7'} className="flow-line" style={{ animationDelay: `${(impacts.get(edge.to) ?? 0) * .5}s` }} />; })}
        <circle cx="350" cy="350" r="86" fill="#0b1019" stroke="#d4af37" strokeOpacity=".22"/>
        <path d="M350 285V415 M285 350H415 M304 304L396 396 M304 396L396 304" stroke="#d4af37" strokeOpacity=".15"/>
        <path d="M350 308L360 340L392 350L360 360L350 392L340 360L308 350L340 340Z" fill="#d4af37" fillOpacity=".13" stroke="#d4af37" strokeOpacity=".6"/>
        <circle cx="350" cy="350" r="6" fill="#d4af37"/>
        <text x="350" y="449" fill="#bca16a" textAnchor="middle" fontSize="10" letterSpacing="5">共 时 · 共 振</text>
        {nodes.map(n => { const p = positions.get(n.id)!; const east = n.side === 'east'; const red = impacts.has(n.id); const isSelected = n.id === selected; const color = red ? '#f43f5e' : east ? '#38bdf8' : '#d4af37'; const right = Math.cos(p.a) >= 0; return <g key={n.id} data-node={n.id} role="button" tabIndex={0} aria-label={`${formatYear(n.year)} ${n.title}`} className={`star-node ${isSelected ? 'selected' : ''} ${red ? 'impacted' : ''}`} onClick={() => onSelect(n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n.id); } }} style={{ animationDelay: `${(impacts.get(n.id) ?? 0) * .6}s` }}>
          {(isSelected || red) && <circle cx={p.x} cy={p.y} r="16" fill={color} fillOpacity=".06" stroke={color} strokeOpacity=".5" className={red ? 'pulse-ring' : ''}/>}
          <circle cx={p.x} cy={p.y} r={isSelected ? 8 : 5} fill={color} opacity=".4" filter="url(#nodeGlow)"/>
          <circle cx={p.x} cy={p.y} r={isSelected ? 5 : 3.5} fill="#0c1420" stroke={color} strokeWidth="1.7"/>
          <circle cx={p.x} cy={p.y} r="13" fill="transparent"/>
          <text x={p.x + (right ? 15 : -15)} y={p.y - 5} fill={color} fontSize="10" textAnchor={right ? 'start' : 'end'} fontFamily="monospace">{formatYear(n.year)}{n.extended ? ' · 延展' : ''}</text>
          <text x={p.x + (right ? 15 : -15)} y={p.y + 12} fill={isSelected ? '#f5ead1' : '#aeb9c9'} fontSize="11" textAnchor={right ? 'start' : 'end'}>{n.title.length > 12 ? n.title.slice(0, 12) + '…' : n.title}</text>
        </g>; })}
      </g>
    </svg>
    <div className="dial-tools"><button aria-label="缩小星盘" onClick={() => setZoom(z => Math.max(.7, z - .1))}><Minus size={14}/></button><span>{Math.round(zoom * 100)}%</span><button aria-label="放大星盘" onClick={() => setZoom(z => Math.min(1.45, z + .1))}><Plus size={14}/></button><i/><button aria-label="重置星盘" onClick={() => { setRotation(0); setZoom(1); }}><RotateCcw size={14}/></button></div>
    <div className="dial-hint">拖拽旋转 · 滚轮缩放 · 点击星点解构历史</div>
  </div>;
}
