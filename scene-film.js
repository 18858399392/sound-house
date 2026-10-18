import { media } from './offline.js';

export const sceneFilms = Object.freeze({
  forest: { src: 'assets/videos/forest-loop.mp4', poster: 'assets/images/forest-film.webp' },
  sea: { src: 'assets/videos/sea-loop.mp4', poster: 'assets/images/sea-film.webp' },
  fire: { src: 'assets/videos/fire-loop.mp4', poster: 'assets/images/fire-film.webp' },
});
export const scenePoster = scene => sceneFilms[scene.id]?.poster || `assets/images/${scene.picture}.webp`;
export const sceneFilmURL = scene => sceneFilms[scene.id]?.src;

// One silent decoder at a time. Video comes from the same verified local cache
// as the sounds; no third-party hotlinks, streaming ranges or audio playback.
export class SceneFilm {
  constructor(stage, onError) {
    this.stage = stage; this.onError = onError; this.token = 0; this.scene = null;
    this.objectURL = null; this.loading = false; this.ready = false;
    this.video = document.createElement('video');
    this.video.className = 'scene-film'; this.video.setAttribute('aria-hidden', 'true');
    this.video.muted = true; this.video.defaultMuted = true; this.video.playsInline = true;
    this.video.setAttribute('muted', ''); this.video.setAttribute('playsinline', '');
    this.video.loop = true; this.video.preload = 'auto'; this.video.disablePictureInPicture = true;
    stage.querySelector('.scene-pictures').appendChild(this.video);
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.observer = new MutationObserver(() => this.sync());
    this.observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => this.sync());
    this.preference.addEventListener('change', () => this.sync());
    // Safari low-power/autoplay restrictions can be lifted by the next normal
    // tap, including the existing sound-play control. Never unmute the film.
    document.addEventListener('pointerdown', () => { if (this.needsGesture) this.sync(); }, { passive: true });
    window.addEventListener('online', () => { this.failed = false; this.sync(); });
    this.video.addEventListener('error', () => {
      if (this.ready) { this.ready = false; this.failed = true; this.video.classList.remove('visible'); this.state('unavailable'); }
    });
  }
  get allowed() { return this.scene && !document.hidden && !document.body.classList.contains('motion-off') && !this.preference.matches; }
  state(value) { this.stage.dataset.filmState = value; }
  setScene(scene) {
    if (this.scene?.id === scene.id) { this.failed = false; this.sync(); return; }
    this.token++; this.controller?.abort(); this.video.pause(); this.video.classList.remove('visible');
    this.video.removeAttribute('src'); this.video.load();
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);
    this.objectURL = null; this.loading = false; this.ready = false; this.failed = false; this.needsGesture = false;
    this.scene = sceneFilms[scene.id] ? scene : null; this.state(this.scene ? 'poster' : 'none'); this.sync();
  }
  sync() {
    if (!this.allowed) { this.video.pause(); this.video.classList.remove('visible'); return; }
    if (!this.ready) { if (!this.loading && !this.failed) void this.load(); return; }
    this.video.muted = true;
    if (!this.video.paused && this.video.classList.contains('visible')) return;
    const token = this.token;
    this.video.play().then(() => {
      if (token !== this.token) return;
      if (!this.allowed) { this.video.pause(); return; }
      this.needsGesture = false; this.video.classList.add('visible'); this.state('playing');
    }).catch(error => {
      if (token !== this.token) return;
      this.needsGesture = error.name === 'NotAllowedError'; this.state(this.needsGesture ? 'tap-to-play' : 'poster');
    });
  }
  async load() {
    const token = this.token, src = sceneFilmURL(this.scene);
    this.loading = true; this.state('loading');
    if (this.objectURL) { this.video.removeAttribute('src'); this.video.load(); URL.revokeObjectURL(this.objectURL); this.objectURL = null; }
    const controller = this.controller = new AbortController();
    try {
      const response = await media.get(src, { signal: controller.signal });
      const blob = await response.blob();
      if (token !== this.token || controller.signal.aborted) return;
      this.objectURL = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }));
      await new Promise((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); this.video.removeEventListener('loadeddata', done); this.video.removeEventListener('error', fail); controller.signal.removeEventListener('abort', fail); };
        const done = () => { cleanup(); resolve(); };
        const fail = () => { cleanup(); reject(new Error('实景视频暂时无法播放')); };
        const timer = setTimeout(fail, 15000);
        this.video.addEventListener('loadeddata', done, { once: true }); this.video.addEventListener('error', fail, { once: true });
        controller.signal.addEventListener('abort', fail, { once: true });
        this.video.src = this.objectURL; this.video.load();
      });
      if (token !== this.token) return;
      this.ready = true; this.loading = false; this.sync();
    } catch (error) {
      if (token !== this.token) return;
      this.loading = false; this.failed = true; this.video.classList.remove('visible'); this.state('unavailable');
      if (!controller.signal.aborted) this.onError('实景视频暂未加载，先显示静帧；声音仍可正常播放，联网后会再试。');
    }
  }
}
