export interface SavedState { era: string; selected: string; sourceId?: string; view: 'ring' | 'timeline'; category: string; muted: boolean; guideSeen: boolean; tab: 'archive' | 'sim'; mode: 'removed' | 'delayed'; active: boolean; records: { id: string; nodeId: string; mode: 'removed' | 'delayed'; date: string }[] }
const key = 'chronoweave:v1';
export const initialState: SavedState = { era: 'revolution', selected: 'newton', view: 'ring', category: 'all', muted: false, guideSeen: false, tab: 'archive', mode: 'removed', active: false, records: [] };
export function loadState(): SavedState {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return initialState;
    return { sourceId: typeof value.sourceId === 'string' ? value.sourceId : undefined, era: typeof value.era === 'string' ? value.era : initialState.era, selected: typeof value.selected === 'string' ? value.selected : initialState.selected, view: value.view === 'timeline' ? 'timeline' : 'ring', category: typeof value.category === 'string' ? value.category : 'all', muted: value.muted === true, guideSeen: value.guideSeen === true, tab: value.tab === 'sim' ? 'sim' : 'archive', mode: value.mode === 'delayed' ? 'delayed' : 'removed', active: value.active === true, records: Array.isArray(value.records) ? value.records.filter((r: SavedState['records'][number]) => r && typeof r.id === 'string' && typeof r.nodeId === 'string' && (r.mode === 'removed' || r.mode === 'delayed') && typeof r.date === 'string').slice(0, 50) : [] };
  } catch { return initialState; }
}
export function saveState(state: SavedState): boolean { try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch { return false; } }
