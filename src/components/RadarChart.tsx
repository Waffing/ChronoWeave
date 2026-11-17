export const dimensions = ['基础科学', '工程技术', '信息传播', '社会组织', '全球化连接'];
export function RadarChart({ baseline, alternate, active }: { baseline: number[]; alternate: number[]; active: boolean }) {
  const p = (i: number, v: number) => [150 + Math.sin(i * Math.PI * 2 / 5) * v * .85, 117 - Math.cos(i * Math.PI * 2 / 5) * v * .85];
  const poly = (values: number[]) => values.map((v, i) => p(i, v).join(',')).join(' ');
  return <svg viewBox="0 0 300 235" className="radar" role="img" aria-label="五维文明形态偏移雷达图，数值为教学模型">
    {[20, 40, 60, 80, 100].map(v => <polygon key={v} points={poly(Array(5).fill(v))} fill="none" stroke="#94a3b8" strokeOpacity=".14" />)}
    {dimensions.map((d, i) => { const end = p(i, 100); const label = p(i, 130); return <g key={d}><line x1="150" y1="117" x2={end[0]} y2={end[1]} stroke="#94a3b8" strokeOpacity=".15" /><text x={label[0]} y={label[1] + 4} textAnchor="middle" fill="#9caabd" fontSize="10">{d}</text></g>; })}
    <polygon points={poly(baseline)} fill="#38bdf8" fillOpacity=".08" stroke="#38bdf8" strokeWidth="1.3" />
    {active && <polygon points={poly(alternate)} fill="#f43f5e" fillOpacity=".16" stroke="#f43f5e" strokeWidth="1.5" />}
    {baseline.map((v, i) => { const [x, y] = p(i, v); return <circle key={i} cx={x} cy={y} r="2" fill="#38bdf8" />; })}
  </svg>;
}
