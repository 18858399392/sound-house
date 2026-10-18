export const MEDIA_CACHE = 'sound-house-media-v1';
const absolute = url => new URL(url, location.href).href;
export const canCache = () => window.isSecureContext && 'caches' in window;
export const formatBytes = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

class OfflineMedia extends EventTarget {
  constructor() { super(); this.pending = new Map(); this.progress = null; this.manifestPromise = null; this.controller = null; }
  emit() { this.dispatchEvent(new Event('change')); }
  async get(url, options = {}) {
    const key = absolute(url);
    if (canCache()) {
      try { const cached = await (await caches.open(MEDIA_CACHE)).match(key); if (cached) return cached; } catch {}
    }
    if (!this.pending.has(key)) {
      const job = (async () => {
        const response = await fetch(key, { signal: options.signal || AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`素材加载失败（${response.status}）`);
        if (canCache()) {
          try { await (await caches.open(MEDIA_CACHE)).put(key, response.clone()); this.emit(); }
          catch { this.dispatchEvent(new Event('storagewarning')); }
        }
        // A buffered Response lets concurrent callers each consume their own body.
        const bytes = await response.arrayBuffer();
        return { bytes, headers: [...response.headers], status: response.status };
      })();
      this.pending.set(key, job); job.finally(() => this.pending.delete(key)).catch(() => {});
    }
    const result = await this.pending.get(key);
    return new Response(result.bytes.slice(0), { status: result.status, headers: result.headers });
  }
  async manifest() {
    if (!this.manifestPromise) this.manifestPromise = fetch('assets/media-manifest.json').then(r => { if (!r.ok) throw new Error('离线清单读取失败'); return r.json(); }).catch(e => { this.manifestPromise = null; throw e; });
    return this.manifestPromise;
  }
  async inventory() {
    const manifest = await this.manifest();
    if (!canCache()) return { keys: new Set(), bytes: 0, count: 0, total: manifest.files.reduce((a,b)=>a+b.bytes,0), files: manifest.files };
    const cache = await caches.open(MEDIA_CACHE), requests = await cache.keys();
    const keys = new Set(requests.map(r => r.url)); let bytes = 0, count = 0;
    for (const file of manifest.files) if (keys.has(absolute(file.url))) { bytes += file.bytes; count++; }
    return { keys, bytes, count, total: manifest.files.reduce((a,b)=>a+b.bytes,0), files: manifest.files };
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
        // get() checks disk before network, so completed items are never re-downloaded.
        await this.get(url, { signal });
        if (!await (await caches.open(MEDIA_CACHE)).match(absolute(url))) throw new Error('浏览器未能保留这个素材，请检查可用存储后再试。');
        this.progress.completed++; this.emit();
      }
      this.progress.active = false; this.progress.done = true;
    } catch (error) { this.progress.active = false; this.progress.cancelled = signal.aborted; if (!signal.aborted) throw error; }
    finally { this.controller = null; this.emit(); }
  }
  cancel() { this.controller?.abort(); }
  async clear() {
    if (this.controller) throw new Error('请先暂停正在进行的保存。');
    if (canCache()) await caches.delete(MEDIA_CACHE);
    this.progress = null; this.emit();
  }
  async requestPersistence() {
    if (!navigator.storage?.persist) return { supported: false, granted: false };
    const granted = await navigator.storage.persist(); return { supported: true, granted };
  }
}
export const media = new OfflineMedia();
