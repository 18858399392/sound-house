export class InstallManager extends EventTarget {
  constructor() {
    super(); this.promptEvent = null;
    this.display = matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); this.promptEvent = event; this.emit(); });
    window.addEventListener('appinstalled', () => { this.promptEvent = null; this.emit(); });
    this.display.addEventListener('change', () => this.emit());
  }
  emit() { this.dispatchEvent(new Event('change')); }
  get installed() { return this.display.matches || navigator.standalone === true; }
  get ios() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; }
  get secure() { return window.isSecureContext; }
  async install() {
    if (!this.promptEvent) return false;
    const prompt = this.promptEvent; this.promptEvent = null;
    await prompt.prompt(); const choice = await prompt.userChoice; this.emit(); return choice.outcome === 'accepted';
  }
}
