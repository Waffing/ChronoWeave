import { useEffect, useRef } from 'react';
import { Compass, X, Orbit, MousePointer2, Zap, Download } from 'lucide-react';
export function Guide({ open, close }: { open: boolean; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); if (!open) ref.current?.close(); }, [open]);
  return <dialog ref={ref} className="guide-dialog" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby="guide-title"><button className="guide-close" aria-label="关闭体验指南" onClick={close}><X size={18}/></button><div className="guide-icon"><Compass size={28}/></div><div className="eyebrow">A JOURNEY ACROSS CIVILIZATIONS</div><h2 id="guide-title">30 秒，折叠一段历史</h2><p>不必读完历史。先拨动一颗文明的星辰。</p><div className="guide-steps">{[{ icon: Orbit, title: '切一个时代', text: '点击顶部四个黄金时代，观察东西方节点如何同时闪耀。' }, { icon: MousePointer2, title: '看见共时共振', text: '拖转星盘或切换双轨时间轴，点击节点，阅读另一端的地球。' }, { icon: Zap, title: '改变一个历史条件', text: '打开蝴蝶效应推演，选择未发生或推迟，触发三层因果涟漪。' }, { icon: Download, title: '带走你的平行时空', text: '比较五维形态变化，导出黑金 PNG 手札；记录仅保存在本机。' }].map((s, i) => <div key={s.title}><s.icon size={19}/><span>0{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div><button className="guide-start" onClick={close}>进入经纬织史 <span>↗</span></button><small>反事实推演为教学启发式模型，不代表确定的历史预测。</small></dialog>;
}
