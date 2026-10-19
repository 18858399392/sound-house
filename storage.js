import { soundById, sceneById } from './data.js';
const KEY = 'sound-house:v2';
export const newId = () => globalThis.crypto?.randomUUID?.() || `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const plain = x => x && typeof x === 'object' && !Array.isArray(x);
const sceneId = id => id === 'train' ? 'tv' : sceneById.has(id) ? id : 'rain';
export function cleanMix(value) {
  if (!plain(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, volume]) => soundById.has(id) && typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 && volume <= 1).slice(0, 8));
}
export function cleanRecipe(value) {
  if (!plain(value)) return null;
  const mix = cleanMix(value.mix);
  if (!Object.keys(mix).length) return null;
  return { id: typeof value.id === 'string' ? value.id.slice(0, 64) : newId(),
    name: typeof value.name === 'string' ? value.name.trim().slice(0, 24) || '我的声音空间' : '我的声音空间',
    scene: sceneId(value.scene), focus: soundById.has(value.focus) ? value.focus : null, mix };
}
export function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('sound-house:v1') || '{}');
    // Replace the removed preset, while retaining independently saved/custom mixes.
    const oldMix = data.last?.mix;
    const wasTrainPreset = (data.scene || data.last?.scene) === 'train' && oldMix && Object.keys(oldMix).length === 2 && oldMix['inside-a-train'] === .6 && oldMix['light-rain'] === .22;
    if (wasTrainPreset) data.last = { ...data.last, scene: 'tv', mix: { ...sceneById.get('tv').mix } };
    return { favorites: Array.isArray(data.favorites) ? data.favorites.filter(x => soundById.has(x)) : [],
      recipes: Array.isArray(data.recipes) ? data.recipes.map(cleanRecipe).filter(Boolean).slice(0, 30) : [],
      last: data.last && typeof data.last === 'object' ? { ...cleanRecipe({ ...data.last, mix: Object.keys(cleanMix(data.last.mix)).length ? data.last.mix : { 'rain-on-window': 0 } }), mix: cleanMix(data.last.mix) } : null,
      scene: sceneId(data.scene || data.last?.scene),
      motion: data.motion !== false, gestureSeen: data.gestureSeen === true,
      master: typeof data.master === 'number' ? Math.max(0, Math.min(1, data.master)) : .7 };
  } catch { return { favorites: [], recipes: [], last: null, scene: 'rain', motion: true, gestureSeen: false, master: .7 }; }
}
export function saveStore(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function shareURL(recipe) {
  const data = cleanRecipe(recipe);
  if (!data) throw new Error('先添加一种声音，再分享配方。');
  const binary = Array.from(new TextEncoder().encode(JSON.stringify({ v: 1, ...data })), x => String.fromCharCode(x)).join('');
  const url = new URL(location.href); url.hash = 'mix=' + btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return url.href;
}
export function readShared(hash) {
  if (!hash.startsWith('#mix=')) return null;
  if (hash.length > 4096) throw new Error('分享链接太长，请检查后重试。');
  try {
    const bytes = Uint8Array.from(atob(hash.slice(5).replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const result = raw.v === 1 ? cleanRecipe(raw) : null;
    if (!result) throw new Error();
    return result;
  } catch { throw new Error('这个声音配方暂时无法读取，请检查分享链接。'); }
}
