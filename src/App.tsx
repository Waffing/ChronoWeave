import { useEffect, useRef, useState } from 'react';
import { Orbit, Compass, Volume2, VolumeX, CircleHelp, CircleDot, Rows3, Play, Pause, ArrowUpRight, History, X, Sparkles, Radio, Zap } from 'lucide-react';
import { eras, nodes, categories, formatYear } from './data/chronoData';
import { Astrolabe } from './components/Astrolabe';
import { Timeline } from './components/Timeline';
import { DetailPanel } from './components/DetailPanel';
import { Guide } from './components/Guide';
import { loadState, saveState } from './lib/storage';
import { impactLevels, type Mode } from './lib/simulation';
import { playSound } from './lib/audio';
const emptyImpacts = new Map<string, number>();
export default function App() {
  const [state, setState] = useState(loadState); const [tab, setTab] = useState<'archive' | 'sim'>(state.tab);
  const [mode, setModeValue] = useState<Mode>(state.mode); const [active, setActive] = useState(state.active);
  const [guide, setGuide] = useState(!state.guideSeen); const [playing, setPlaying] = useState(false); const [speaking, setSpeaking] = useState(false);
  const [sourceId, setSourceId] = useState(state.sourceId ?? state.selected);
  const [history, setHistory] = useState(false); const [notice, setNotice] = useState(''); const cruiseIndex = useRef(0);
  const era = eras.find(e => e.id === state.era) ?? eras[2];
  const selected = nodes.find(n => n.id === state.selected) ?? nodes.find(n => n.id === 'newton')!;
  const visibleNodes = nodes.filter(n => n.eraId === era.id && (state.category === 'all' || n.category === state.category));
  const source = nodes.find(n => n.id === sourceId) ?? selected;
  const impacts = active ? impactLevels(source.id) : emptyImpacts;
  useEffect(() => { if (!saveState({ ...state, tab, mode, active, sourceId })) setNotice('浏览器限制了本地存储；本次仍可体验，刷新后记录可能丢失。'); }, [state, tab, mode, active, sourceId]);
  useEffect(() => {
    if (!playing) return;
    const sorted = [...visibleNodes].sort((a, b) => a.year - b.year);
    if (!sorted.length) { setPlaying(false); return; }
    const show = () => {
      const n = sorted[cruiseIndex.current % sorted.length]; cruiseIndex.current++;
      setState(s => ({ ...s, selected: n.id })); setActive(false); playSound('tick', !state.muted);
      if (speaking && 'speechSynthesis' in window) { const voices = window.speechSynthesis.getVoices(); const voice = voices.find(v => v.lang.startsWith('zh')); if (voice) { window.speechSynthesis.cancel(); const text = new SpeechSynthesisUtterance(`${formatYear(n.year)}，${n.title}。${n.breakthrough}`); text.lang = 'zh-CN'; text.voice = voice; window.speechSynthesis.speak(text); } else { setNotice('未检测到中文系统语音，继续文字巡航。'); setSpeaking(false); } }
    };
    show(); const timer = window.setInterval(show, 6500);
    return () => { clearInterval(timer); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, [playing, era.id, state.category, speaking, state.muted]);
  function select(id: string) {
    const n = nodes.find(n => n.id === id); if (!n) return;
    setState(s => ({ ...s, selected: id, era: n.eraId, category: s.category === 'all' || s.category === n.category ? s.category : 'all' })); setPlaying(false); playSound('tick', !state.muted);
  }
  function changeEra(id: string) {
    const preferred = id === 'revolution' ? 'newton' : id === 'song' ? 'bisheng' : nodes.find(n => n.eraId === id)!.id;
    setState(s => ({ ...s, era: id, selected: preferred, category: 'all' })); setPlaying(false); playSound('rotate', !state.muted);
  }
  function trigger() {
    setSourceId(selected.id); setActive(true); setPlaying(false); playSound('fold', !state.muted);
    setState(s => ({ ...s, records: [{ id: crypto.randomUUID(), nodeId: selected.id, mode, date: new Date().toISOString() }, ...s.records].slice(0, 50) }));
  }
  const closeGuide = () => { setGuide(false); setState(s => ({ ...s, guideSeen: true })); };
  return <div className={`app-shell ${active ? 'simulation-active' : ''}`}>
    <div className="sky-grid" aria-hidden="true"/><svg className="celestial-backdrop" viewBox="0 0 1000 1000" aria-hidden="true"><g fill="none" stroke="currentColor">{[220, 280, 340, 400, 460].map(r => <circle key={r} cx="500" cy="500" r={r}/>)}{Array.from({ length: 72 }, (_, i) => <path key={i} transform={`rotate(${i * 5} 500 500)`} d={`M500 40V${i % 6 === 0 ? 65 : 49}`}/>)}</g></svg><header className="topbar"><a className="brand" href="#" aria-label="ChronoWeave 经纬织史"><div className="brand-mark"><Orbit size={28}/></div><div><strong>Chrono<span>Weave</span><em>经纬织史</em></strong><small>跨文明时空折叠沙盘</small></div></a><div className="top-actions"><span className="local-status"><i/>纯前端 · 本地运行</span><button className="icon-button" aria-label={state.muted ? '开启机械音效' : '静音机械音效'} aria-pressed={!state.muted} onClick={() => { if (state.muted) playSound('tick', true); setState(s => ({ ...s, muted: !s.muted })); }}>{state.muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button><button className="guide-button" onClick={() => setGuide(true)}><Compass size={15}/>评委 30 秒体验指南<ArrowUpRight size={13}/></button></div></header>
    <main><div className="intro-row"><div><div className="eyebrow"><span/>THE ATLAS OF HUMAN POSSIBILITY</div><h1>文明并非孤岛，<span>历史自有回响。</span></h1><p>在时间切片里看见全球文明共振，于因果网络中推演历史蝴蝶效应</p></div><div className="intro-meta"><strong>4<span>黄金时代</span></strong><i/><strong>{nodes.length}<span>文明坐标</span></strong><i/><Compass size={31} strokeWidth={.8}/></div></div>
      <nav className="era-switcher" aria-label="黄金时代切片">{eras.map((e, i) => <button key={e.id} className={e.id === era.id ? 'active' : ''} onClick={() => changeEra(e.id)}><span className="era-num">0{i + 1}</span><div><strong>{e.title}</strong><small>{e.range}</small></div><span className="era-indicator"/></button>)}</nav>
      <div className="workspace"><section className="stage"><div className="stage-header"><div><span className="eyebrow">CIVILIZATION OBSERVATORY</span><h2>{active ? '平行时空 · 因果涟漪' : '跨文明共时观测台'}<span className="live-dot"/></h2></div><div className="view-switch" role="group" aria-label="切换主舞台视图"><button className={state.view === 'ring' ? 'active' : ''} onClick={() => setState(s => ({ ...s, view: 'ring' }))}><CircleDot size={14}/>星盘</button><button className={state.view === 'timeline' ? 'active' : ''} onClick={() => setState(s => ({ ...s, view: 'timeline' }))}><Rows3 size={14}/>双轨</button></div></div>
        <div className="stage-subheader"><span><i className="cyan-dot"/>东方文明</span><span><i className="gold-dot"/>西方文明</span><span><i className="purple-line"/>共时 / 因果关联</span><button onClick={() => setNotice('虚线为因果关联，点线为年代或主题对照；关联依据见节点档案。延展节点使用真实年份。')} aria-label="了解连线含义"><CircleHelp size={13}/></button></div>
        <div className="stage-canvas" key={`${era.id}-${state.view}`}>
          <div className="stage-coordinates">{era.range}<span>OBSERVATION WINDOW / {String(eras.indexOf(era) + 1).padStart(2, '0')}</span></div>
          {active && <button className="return-source" onClick={() => { setState(s => ({ ...s, selected: source.id, era: source.eraId, category: 'all' })); setTab('sim'); }}>推演源：{source.title} ↗</button>}
          {state.view === 'ring' ? <Astrolabe nodes={visibleNodes} era={era} selected={selected.id} onSelect={select} impacts={impacts} muted={state.muted}/> : <Timeline nodes={visibleNodes} selected={selected.id} onSelect={select} impacts={impacts}/>}
          {visibleNodes.length === 0 && <div className="empty-state">这一切片暂无该领域节点。<button onClick={() => setState(s => ({ ...s, category: 'all' }))}>查看全部领域</button></div>}
          {active && <div className="impact-banner"><Zap size={14}/>{source.title} · 时空折叠<span>{impacts.size} 个节点 · {Math.max(...impacts.values())} 层传播</span></div>}
        </div>
        <div className="stage-controls"><div className="category-filters" aria-label="领域筛选">{categories.map(c => <button key={c.id} className={state.category === c.id ? 'active' : ''} onClick={() => { const first = nodes.find(n => n.eraId === era.id && (c.id === 'all' || n.category === c.id)); setState(s => ({ ...s, category: c.id, selected: first && selected.category !== c.id && c.id !== 'all' ? first.id : s.selected })); setPlaying(false); }}>{c.label}</button>)}</div><div className="cruise-controls"><button aria-label={playing ? '暂停巡航' : '自动巡航演进'} className={playing ? 'playing' : ''} onClick={() => { cruiseIndex.current = 0; setPlaying(!playing); }}>{playing ? <Pause size={13}/> : <Play size={13}/>}<span>{playing ? '暂停巡航' : '自动巡航演进'}</span></button><button className={speaking ? 'speaking' : ''} aria-label="切换巡航语音朗读" aria-pressed={speaking} onClick={() => { if (!('speechSynthesis' in window)) { setNotice('此浏览器不支持系统朗读，文字巡航始终可用。'); return; } setSpeaking(!speaking); }}><Radio size={13}/></button></div></div>
        <div className="stage-status"><span><span className="live-dot"/>{visibleNodes.length} 个历史节点已映射</span><span>{playing ? `巡航简评：${selected.breakthrough}` : '时间可以对照，可能性值得追问。'}</span></div>
      </section><DetailPanel node={active && tab === 'sim' ? source : selected} tab={tab} setTab={setTab} select={select} active={active} trigger={trigger} reset={() => setActive(false)} mode={mode} setMode={m => { setModeValue(m); setActive(false); }} impactCount={impacts.size}/></div>
      <footer><span><Sparkles size={12}/>CHRONOWEAVE <i>/</i> 2026 STUDYHACK</span><p>以史实为经，以想象为纬。反事实推演为教学模型，非确定性预测。</p><button onClick={() => setHistory(!history)}><History size={13}/>本地推演记录 <b>{state.records.length}</b></button></footer>
    </main>
    {notice && <div role="status" className="toast">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={14}/></button></div>}
    {history && <div className="history-panel"><div><h3>本地推演手记</h3><button aria-label="关闭推演记录" onClick={() => setHistory(false)}><X size={16}/></button></div>{state.records.length ? state.records.map(r => { const n = nodes.find(n => n.id === r.nodeId); return n ? <button key={r.id} onClick={() => { select(n.id); setSourceId(n.id); setModeValue(r.mode); setTab('sim'); setActive(true); setHistory(false); }}><span>{n.title}<small>{r.mode === 'removed' ? '假设未发生' : '推迟 200 年'} · {new Date(r.date).toLocaleString('zh-CN')}</small></span><ArrowUpRight size={14}/></button> : null; }) : <p>还没有推演记录。改变一个历史条件，写下第一条平行时空手记。</p>}</div>}
    <Guide open={guide} close={closeGuide}/>
  </div>;
}
