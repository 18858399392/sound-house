import { mediaFiles } from './media-index.js';
export const MEDIA_CACHE = 'sound-house-media-v1';
const absolute = url => new URL(url, location.href).href;
const index = new Map(mediaFiles.map(file => [absolute(file.url), file]));
export const canCache = () => window.isSecureContext && 'caches' in window;
export const formatBytes = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
const bounded = (job, ms = 1500) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('本机存储响应较慢')), ms);
  Promise.resolve(job).then(resolve, reject).finally(() => clearTimeout(timer));
});
function waitFor(job, signal) {
  if (!signal) return job;
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new DOMException('已暂停保存', 'AbortError'));
    if (signal.aborted) return cancel();
    signal.addEventListener('abort', cancel, { once: true });
    job.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}
class OfflineMedia extends EventTarget {
  constructor() { super(); this.pending = new Map(); this.writes = new Map(); this.progress = null; this.controller = null; this.storageWarned = false; }
  emit() { this.dispatchEvent(new Event('change')); }
  storageWarning() { if (!this.storageWarned) { this.storageWarned = true; this.dispatchEvent(new Event('storagewarning')); } }
  async valid(key, response, bytes) {
    const file = index.get(key);
    if (response.status !== 200 || !bytes.byteLength || /text\/html/i.test(response.headers.get('Content-Type') || '')) return false;
    if (!file) return true;
    if (bytes.byteLength !== file.bytes) return false;
    if (crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('') === file.sha256;
    }
    return true;
  }
  async invalidate(url) {
    if (canCache()) try { await bounded((async () => (await caches.open(MEDIA_CACHE)).delete(absolute(url)))()); } catch {}
  }
  save(key, bytes, headers) {
    if (!canCache()) return;
    // Only the app writes managed media. Disk never gates audio decoding.
    const job = bounded((async () => {
      const cache = await caches.open(MEDIA_CACHE);
      await cache.put(key, new Response(bytes.slice(0), { headers })); this.emit();
    })(), 8000).catch(() => this.storageWarning());
    this.writes.set(key, job);
    job.finally(() => { if (this.writes.get(key) === job) this.writes.delete(key); });
  }
  async load(key, force) {
    const video = /\/assets\/videos\//.test(key);
    if (!force && canCache()) {
      try {
        const cached = await bounded((async () => {
          const response = await (await caches.open(MEDIA_CACHE)).match(key);
          if (!response) return null;
          const bytes = await response.arrayBuffer();
          if (!await this.valid(key, response, bytes)) { void this.invalidate(key); return null; }
          return { bytes, headers: [...response.headers] };
        })(), video ? 4000 : 1500);
        if (cached) return cached;
      } catch { /* CacheStorage is optional; keep online playback available. */ }
    }
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(key, {
          headers: { 'X-Sound-House-Media': '1' },
          cache: force || attempt ? 'reload' : 'default',
          priority: video ? 'low' : 'high',
          signal: AbortSignal.timeout(video ? (attempt ? 120000 : 60000) : (attempt ? 40000 : 18000)),
        });
        const bytes = await response.arrayBuffer();
        if (!await this.valid(key, response, bytes)) throw new Error('素材下载不完整');
        const headers = new Headers(response.headers);
        headers.delete('Content-Encoding'); headers.set('Content-Length', String(bytes.byteLength));
        this.save(key, bytes, headers);
        return { bytes, headers: [...headers] };
      } catch (error) {
        lastError = error;
        if (navigator.onLine === false) break;
        if (!attempt) await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    const error = new Error(navigator.onLine === false ? '离线时还没有这段素材，请联网加载一次' : '连接暂时不稳定，请点重试');
    error.cause = lastError; throw error;
  }
  async get(url, options = {}) {
    const key = absolute(url);
    if (!this.pending.has(key)) {
      const job = this.load(key, options.force);
      this.pending.set(key, job);
      job.finally(() => { if (this.pending.get(key) === job) this.pending.delete(key); }).catch(() => {});
    }
    // Pausing a download detaches that caller, never a shared foreground sound.
    const result = await waitFor(this.pending.get(key), options.signal);
    return new Response(result.bytes.slice(0), { headers: result.headers });
  }
  async manifest() { return { files: mediaFiles }; }
  async inventory() {
    let keys = new Set();
    if (canCache()) try {
      const requests = await bounded((async () => (await caches.open(MEDIA_CACHE)).keys())());
      keys = new Set(requests.map(r => r.url));
    } catch {}
    let bytes = 0, count = 0;
    for (const file of mediaFiles) if (keys.has(absolute(file.url))) { bytes += file.bytes; count++; }
    return { keys, bytes, count, total: mediaFiles.reduce((a,b)=>a+b.bytes,0), files: mediaFiles };
  }
  async download(urls) {
    if (!canCache()) throw new Error('离线保存需要 HTTPS 或这台电脑的 localhost 地址。');
    if (this.controller) throw new Error('已有保存任务正在进行。');
    this.controller = new AbortController();
    const items = [...new Set(urls)], signal = this.controller.signal;
    this.progress = { completed: 0, total: items.length, active: true }; this.emit();
    try {
      for (const url of items) {
        if (signal.aborted) throw new DOMException('已暂停保存', 'AbortError');
        await this.get(url, { signal });
        await waitFor(this.writes.get(absolute(url)) || Promise.resolve(), signal);
        const saved = await bounded((async () => (await caches.open(MEDIA_CACHE)).match(absolute(url)))());
        if (!saved) throw new Error('声音可以在线播放，但浏览器未能保存离线副本，请检查可用空间。');
        this.progress.completed++; this.emit();
      }
      this.progress.active = false; this.progress.done = true;
    } catch (error) { this.progress.active = false; this.progress.cancelled = signal.aborted; if (!signal.aborted) throw error; }
    finally { this.controller = null; this.emit(); }
  }
  cancel() { this.controller?.abort(); }
  async clear() {
    if (this.controller) throw new Error('请先暂停正在进行的保存。');
    await Promise.all([...this.writes.values()]);
    if (canCache()) await caches.delete(MEDIA_CACHE);
    this.storageWarned = false; this.progress = null; this.emit();
  }
  async requestPersistence() {
    if (!navigator.storage?.persist) return { supported: false, granted: false };
    const granted = await navigator.storage.persist(); return { supported: true, granted };
  }
}
export const media = new OfflineMedia();
