import { media } from './offline.js';
import { SceneMotion } from './scene-motion.js';
export class SceneView {
  constructor(stage, onStep, onError) {
    this.stage = stage; this.onStep = onStep; this.onError = onError;
    this.motion = new SceneMotion(stage.querySelector('#atmosphere'));
    this.images = [...stage.querySelectorAll('.scene-image')]; this.active = 0; this.token = 0; this.current = null; this.blobs = [];
    let start = null, lastWheel = 0, wheelSum = 0;
    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('button,input,a,dialog') || event.pointerType === 'mouse' && event.button !== 0 || document.querySelector('dialog[open]')) return;
      if (event.clientX < 18 || event.clientX > innerWidth - 18) return;
      start = { x: event.clientX, y: event.clientY, at: performance.now(), id: event.pointerId };
    });
    stage.addEventListener('pointerup', event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y, elapsed = performance.now() - start.at;
      start = null;
      if (elapsed > 1500 || Math.max(Math.abs(dx), Math.abs(dy)) < 65) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) onStep(dy < 0 ? 1 : -1);
      else if (Math.abs(dx) > Math.abs(dy) * 1.2) onStep(dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', () => start = null);
    stage.addEventListener('wheel', event => {
      if (document.querySelector('dialog[open]') || event.ctrlKey) return;
      event.preventDefault(); if (Date.now() - lastWheel < 1000) return;
      wheelSum += event.deltaY;
      if (Math.abs(wheelSum) > 80) { onStep(wheelSum > 0 ? 1 : -1); lastWheel = Date.now(); wheelSum = 0; }
    }, { passive: false });
  }
  async show(scene, initial = false) {
    const token = ++this.token;
    if (this.current?.picture === scene.picture) { this.current = scene; this.weather(scene); return true; }
    let blobURL;
    try {
      const response = await media.get(`assets/images/${scene.picture}.webp`);
      blobURL = URL.createObjectURL(await response.blob());
      const next = this.images[1 - this.active]; next.src = blobURL; next.alt = `${scene.title}的写实场景`;
      await next.decode();
      if (token !== this.token) { URL.revokeObjectURL(blobURL); return false; }
      const previous = this.images[this.active];
      next.classList.add('visible'); previous.classList.remove('visible'); this.active = 1 - this.active;
      this.current = scene; this.stage.dataset.scene = scene.id; this.weather(scene);
      this.blobs.push(blobURL);
      if (this.blobs.length > 2) { const old = this.blobs.shift(); setTimeout(() => URL.revokeObjectURL(old), 1500); }
      return true;
    } catch {
      if (blobURL) URL.revokeObjectURL(blobURL);
      if (token === this.token) this.onError('这个画面还没离线保存，联网后可以再切换。');
      return false;
    }
  }
  weather(scene) {
    this.motion.setScene(scene,this.images[this.active]);
  }
}
