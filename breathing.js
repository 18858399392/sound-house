// A visual optional rhythm. It never changes the audio or asks for breath holds.
export class BreathingGuide {
  constructor(stage) {
    this.host = document.createElement('div'); this.host.className = 'breathing-guide'; this.host.hidden = true;
    this.host.setAttribute('role', 'note'); this.host.setAttribute('aria-label', '自然呼吸，不必勉强跟随。圆环提供吸气4秒、呼气6秒的可选参考节奏。');
    this.host.innerHTML = '<div class="breathing-orbit" aria-hidden="true"><span class="breathing-ring"></span><span class="breathing-word">吸气</span></div><p>自然呼吸 · 不必勉强跟随</p>';
    stage.appendChild(this.host); this.label = this.host.querySelector('.breathing-word');
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.observer = new MutationObserver(() => this.sync()); this.observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => this.sync()); this.preference.addEventListener('change', () => this.sync());
    this.elapsed = 0; this.timer = null; this.started = 0;
  }
  setScene(scene) {
    if (this.active === (scene.id === 'meditation')) return;
    this.active = scene.id === 'meditation'; this.elapsed = 0; this.host.hidden = !this.active; this.sync();
  }
  get enabled() { return this.active && !document.hidden && !document.body.classList.contains('motion-off') && !this.preference.matches; }
  sync() {
    if (this.started) this.elapsed += performance.now() - this.started;
    this.started = 0; clearTimeout(this.timer); this.timer = null;
    this.host.classList.toggle('is-still', !this.enabled);
    if (!this.active) return;
    if (!this.enabled) { this.label.textContent = '自然呼吸'; return; }
    this.started = performance.now(); this.update();
  }
  update() {
    if (!this.enabled) return;
    const phase = (this.elapsed + performance.now() - this.started) % 10000;
    const inhale = phase < 4000, progress = inhale ? phase / 4000 : (10000 - phase) / 6000;
    const ease = progress * progress * (3 - 2 * progress);
    this.host.style.setProperty('--breath-scale', String(.72 + ease * .28));
    this.label.textContent = inhale ? '吸气' : '呼气'; this.host.dataset.phase = inhale ? 'inhale' : 'exhale';
    this.timer = setTimeout(() => this.update(), 80);
  }
}
