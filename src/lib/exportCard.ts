import { formatYear, type ChronoNode } from '../data/chronoData';

const WIDTH = 1600;
const MARGIN = 112;
const CONTENT = WIDTH - MARGIN * 2;
const GOLD = '#d6b77a';
const INK = '#0b1014';
const PAPER = '#ede6d8';
const MUTED = '#b0aaa0';
const FONT = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

type TextBlock = { text: string; size: number; color: string; gap: number; weight: number };
type MeasuredBlock = TextBlock & { lines: string[]; height: number };

/** Measure code points rather than splitting UTF-16 surrogate pairs. Preserve newlines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && ctx.measureText(line + character).width > width) {
        result.push(line);
        line = character;
      } else line += character;
    }
    result.push(line);
  }
  return result;
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  for (const r of [radius, radius - 16, radius - 47]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 120; i++) {
    const angle = i / 120 * Math.PI * 2;
    const inner = radius - (i % 10 === 0 ? 40 : i % 5 === 0 ? 26 : 20);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * (radius - 6), y + Math.sin(angle) * (radius - 6));
    ctx.stroke();
  }
  ctx.restore();
}

function radar(
  ctx: CanvasRenderingContext2D,
  top: number,
  baseline: readonly number[],
  alternate: readonly number[],
): number {
  const x = WIDTH / 2;
  const y = top + 300;
  const radius = 205;
  // Preserve scores above 100 rather than silently clipping their polygon.
  const scale = Math.max(100, ...baseline.map(Math.abs), ...alternate.map(Math.abs));
  const point = (index: number, value: number): [number, number] => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    return [x + Math.cos(angle) * value, y + Math.sin(angle) * value];
  };
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#4b463b';
  for (let level = 1; level <= 5; level++) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const [px, py] = point(i, radius * level / 5);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(...point(i, radius));
    ctx.stroke();
    const [lx, ly] = point(i, radius + 65);
    ctx.fillStyle = PAPER;
    ctx.font = `24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(['基础科学', '工程技术', '信息传播', '社会组织', '全球化连接'][i], lx, ly);
  }
  const polygon = (values: readonly number[], color: string, fill: string, dashed: boolean) => {
    ctx.beginPath();
    values.forEach((value, i) => {
      const [px, py] = point(i, radius * Math.max(0, value) / scale);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash(dashed ? [12, 8] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  polygon(baseline, GOLD, 'rgba(214,183,122,0.10)', true);
  polygon(alternate, '#81c7c0', 'rgba(129,199,192,0.19)', false);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `25px ${FONT}`;
  const legendY = top + 615;
  ctx.strokeStyle = GOLD;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(MARGIN, legendY + 14);
  ctx.lineTo(MARGIN + 60, legendY + 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = GOLD;
  ctx.fillText('史实基线（教学评分）', MARGIN + 80, legendY);
  ctx.strokeStyle = '#81c7c0';
  ctx.beginPath();
  ctx.moveTo(850, legendY + 14);
  ctx.lineTo(910, legendY + 14);
  ctx.stroke();
  ctx.fillStyle = '#81c7c0';
  ctx.fillText('当前假设（非历史事实）', 930, legendY);
  ctx.fillStyle = MUTED;
  ctx.font = `23px ${FONT}`;
  ctx.fillText(`径向范围 0–${scale}；五维分值为启发式教学参数，非实测指标。`, MARGIN, legendY + 50);
  ctx.restore();
  return top + 730;
}

/** Export a self-contained, locally rendered museum-style PNG. */
export async function exportCard(
  node: ChronoNode,
  comparison: ChronoNode,
  mode: 'removed' | 'delayed',
  active: boolean,
): Promise<void> {
  if (typeof document === 'undefined') return;
  // Wait for any locally available fonts before both measurement and painting.
  if (document.fonts) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法创建 Canvas，不能导出卡片。');

  const factor = mode === 'removed' ? 1 : 0.65;
  const baseline = node.whatIf.baseline;
  const scores = mode === 'removed'
    ? [...node.whatIf.alternate]
    : baseline.map((value, i) => Math.round(value - (value - node.whatIf.alternate[i]) * factor));
  const delay = Math.round(node.whatIf.delay * factor);
  const modeName = mode === 'removed' ? '移除节点' : '延迟发生';
  const state = active ? '已启用假设 · 教学模拟' : '预览假设 · 尚未触发';
  const coordinates = typeof node.coordinates === 'object'
    ? JSON.stringify(node.coordinates)
    : String(node.coordinates);
  const blocks: TextBlock[] = [];
  const add = (text: string, size = 29, color = PAPER, gap = 20, weight = 400) => {
    blocks.push({ text, size, color, gap, weight });
  };
  const section = (text: string) => add(text, 27, GOLD, 24, 600);

  add('CHRONOWEAVE  /  文明的时间织机', 24, GOLD, 38, 600);
  add('ChronoWeave 时空推演手札', 38, GOLD, 22);
  add(node.title, 65, PAPER, 28, 600);
  add(`${formatYear(node.year)}  ·  ${node.location}`, 33, GOLD, 15);
  add(`地理坐标：${coordinates}`, 24, MUTED, 34);
  add(`${modeName}  /  ${state}`, 29, '#81c7c0', 30, 600);
  section('01  /  史实档案');
  add(`关键突破：${node.breakthrough}`);
  add(`历史意义：${node.significance}`, 29, PAPER, 32);
  section('02  /  跨文明对照');
  add(node.comparison);
  add(`对照节点：${comparison.title} · ${formatYear(comparison.year)} · ${comparison.location}`, 30, GOLD);
  add(`对照突破：${comparison.breakthrough}`);
  add(`对照意义：${comparison.significance}`, 29, PAPER, 32);
  section('03  /  专属三层冲击 · 条件性推演');
  add(`以下内容${active ? '属于已启用的教学假设' : '仅为预览假设，尚未在交互中触发'}，不代表真实历史已经改变。`, 26, MUTED);
  add(`第一层 · 直接冲击\n${node.whatIf.direct}`);
  add(`第二层 · 跨文明传导\n${node.whatIf.cross}`);
  add(`第三层 · 现代回响\n${node.whatIf.modern}`, 29, PAPER, 32);
  section('04  /  五维雷达 · 史实基线与假设对照');

  const measure = (block: TextBlock): MeasuredBlock => {
    ctx.font = `${block.weight} ${block.size}px ${FONT}`;
    const lines = wrap(ctx, block.text, CONTENT);
    return { ...block, lines, height: lines.length * block.size * 1.6 + block.gap };
  };
  const measured = blocks.map(measure);
  const chartTop = MARGIN + measured.reduce((sum, block) => sum + block.height, 0);
  const after: TextBlock[] = [];
  const note = (text: string, color = MUTED) => after.push({ text, size: 26, color, gap: 22, weight: 400 });
  note(`五维数值（基线 → 当前假设）：${baseline.map((value, i) => `${['基础科学', '工程技术', '信息传播', '社会组织', '全球化连接'][i]}：${value} → ${scores[i]}`).join('；')}。`, PAPER);
  note(`模型延迟值：${delay} 年${active ? '（已启用的模拟参数）' : '（预览参数，尚未触发）'}。`, GOLD);
  note(mode === 'removed'
    ? '移除模式：五维使用 alternate，延迟使用 delay；这些参数不是历史预测。'
    : '延迟模式：各维度 = round(baseline − (baseline − alternate) × 0.65)；延迟 = round(delay × 0.65)。');
  note(`模型不确定性：${node.whatIf.uncertainty}`);
  note('史实 / 教学模型说明：上方史实档案与跨文明对照用于历史知识展示；三层冲击、五维评分和延迟值均为简化教学模型，不能视为经证实的因果关系、精确年代预测或真实历史结论。');
  note('CHRONOWEAVE  ·  让历史被看见，让假设有边界。', GOLD);
  const measuredAfter = after.map(measure);
  canvas.height = Math.max(2100, Math.ceil(chartTop + 730 + measuredAfter.reduce((sum, block) => sum + block.height, 0) + MARGIN));

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  const glow = ctx.createRadialGradient(1380, 200, 10, 1380, 200, 720);
  glow.addColorStop(0, 'rgba(214,183,122,0.10)');
  glow.addColorStop(1, 'rgba(214,183,122,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  ring(ctx, 1450, 130, 310);
  ctx.strokeStyle = '#65563b';
  ctx.lineWidth = 2;
  ctx.strokeRect(45, 45, WIDTH - 90, canvas.height - 90);
  ctx.strokeStyle = '#302c24';
  ctx.strokeRect(58, 58, WIDTH - 116, canvas.height - 116);
  ctx.textBaseline = 'top';
  const paint = (items: MeasuredBlock[], start: number): number => {
    let y = start;
    for (const block of items) {
      ctx.fillStyle = block.color;
      ctx.font = `${block.weight} ${block.size}px ${FONT}`;
      for (const line of block.lines) {
        ctx.fillText(line, MARGIN, y);
        y += block.size * 1.6;
      }
      y += block.gap;
    }
    return y;
  };
  paint(measured, MARGIN);
  const footerTop = radar(ctx, chartTop, baseline, scores);
  paint(measuredAfter, footerTop);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => {
      if (value) resolve(value);
      else reject(new Error('PNG 编码失败，请尝试较短的卡片内容或其他浏览器。'));
    }, 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = `ChronoWeave-${node.id}-${mode}.png`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    // Give the browser a task boundary to consume the object URL before releasing it.
    await new Promise<void>(resolve => window.setTimeout(resolve, 1000));
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
