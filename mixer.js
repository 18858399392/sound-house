import { soundById, configForSound } from './data.js';
import { media } from './offline.js';
const between = ([a, b]) => a + Math.random() * (b - a);

// Moodist-inspired lazy independent layers, with calibrated loops and intermittent accents.
// Original project MIT copyright (c) 2023 MAZE; see LICENSE-Moodist.
export class SoundMixer extends EventTarget {
  constructor() {
    super(); this.mix = {}; this.master = .7; this.playing = false; this.generation = 0;
    this.nodes = new Map(); this.buffers = new Map(); this.pending = new Map(); this.errors = new Map(); this.fading = new Set();
    this.calibration = new Map(); this.decodeQueue = Promise.resolve(); this.previewId = null; this.previewToken = 0;
  }
  emit() { this.dispatchEvent(new Event('change')); }
  init() {
    if (this.context) return;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) throw new Error('当前浏览器无法混合声音，请使用新版浏览器。');
    this.context = new Constructor(); this.output = this.context.createGain(); this.output.gain.value = this.master;
    this.mixBus = this.context.createGain(); this.mixBus.connect(this.output);
    this.compressor = this.context.createDynamicsCompressor(); this.compressor.threshold.value = -9; this.compressor.ratio.value = 8;
    this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 1024;
    this.output.connect(this.compressor); this.compressor.connect(this.analyser); this.analyser.connect(this.context.destination);
    this.context.addEventListener('statechange', () => this.emit());
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  }
  async buffer(id) {
    if (this.buffers.has(id)) { const value = this.buffers.get(id); this.buffers.delete(id); this.buffers.set(id, value); return value; }
    if (this.pending.has(id)) return this.pending.get(id);
    const job = (async () => {
      const src = soundById.get(id).src;
      const bytes = await (await media.get(src)).arrayBuffer();
      const decode = this.decodeQueue.then(async () => {
        let original;
        try { original = await this.context.decodeAudioData(bytes); }
        catch {
          await media.invalidate(src);
          original = await this.context.decodeAudioData(await (await media.get(src, { force: true })).arrayBuffer());
        }
        const config = configForSound(id);
        const frames = Math.min(original.length, Math.floor(original.sampleRate * config.seconds));
        // For separated field takes, choose the most active window rather than a silent lead-in.
        let offset = 0;
        if (id === 'bamboo' && original.length > frames) {
          const data = original.getChannelData(0), stride = Math.floor(original.sampleRate * 5); let best = -1;
          for (let start = 0; start + frames <= original.length; start += stride) {
            let energy = 0; for (let i = start; i < start + frames; i += 199) energy += data[i] * data[i];
            if (energy > best) { best = energy; offset = start; }
          }
        }
        const event = config.mode === 'event';
        const edge = event ? 0 : Math.min(Math.floor(original.sampleRate * config.blend), Math.floor(frames / 5));
        const buffer = this.context.createBuffer(original.numberOfChannels, frames - edge, original.sampleRate);
        for (let c = 0; c < original.numberOfChannels; c++) {
          const input = original.getChannelData(c).subarray(offset), output = buffer.getChannelData(c);
          output.set(input.subarray(edge, frames));
          for (let i = 0; i < edge; i++) {
            const t = i / Math.max(1, edge - 1);
            output[output.length - edge + i] = input[frames - edge + i] * Math.cos(t * Math.PI / 2) + input[i] * Math.sin(t * Math.PI / 2);
          }
        }
        let energy = 0, peak = 0, count = 0;
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const samples = buffer.getChannelData(c);
          for (let i = 0; i < samples.length; i += 37) { const value = samples[i]; energy += value * value; peak = Math.max(peak, Math.abs(value)); count++; }
        }
        const rms = Math.sqrt(energy / Math.max(1, count));
        const target = event ? .105 : .065;
        const correction = Math.min(2.5, .82 / Math.max(.001, peak), Math.max(.3, target / Math.max(.001, rms)));
        this.calibration.set(id, { rms, peak, correction, mode: config.mode, seconds: buffer.duration });
        return buffer;
      });
      this.decodeQueue = decode.catch(() => {});
      const buffer = await decode; this.buffers.set(id, buffer); this.trimBuffers(); return buffer;
    })();
    this.pending.set(id, job); this.errors.delete(id); this.emit();
    try { return await job; } finally { this.pending.delete(id); this.emit(); }
  }
  trimBuffers() {
    let size = [...this.buffers.values()].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0);
    for (const [id, buffer] of this.buffers) {
      if (this.buffers.size <= 8 && size < 150 * 1048576) break;
      if (!(id in this.mix) && id !== this.previewId) { this.buffers.delete(id); size -= buffer.length*buffer.numberOfChannels*4; }
    }
  }
  level(id) { return (this.mix[id] || 0) * .6 * (this.calibration.get(id)?.correction || 1); }
  createSource(id, buffer, layer, at = this.context.currentTime) {
    const source = this.context.createBufferSource(); source.buffer = buffer;
    source.loop = layer.mode === 'loop';
    source.playbackRate.value = layer.mode === 'event' ? between([.985, 1.015]) : 1;
    source.connect(layer.gain); layer.sources.add(source);
    source.onended = () => { layer.sources.delete(source); source.disconnect(); };
    source.start(at); layer.source = source; return source;
  }
  scheduleAccent(id, layer, buffer) {
    if (!this.playing || this.nodes.get(id) !== layer) return;
    this.createSource(id, buffer, layer);
    const gap = between(configForSound(id).gap);
    layer.nextGap = gap;
    layer.timer = setTimeout(() => this.scheduleAccent(id, layer, buffer), (buffer.duration + gap) * 1000);
  }
  async startLayer(id) {
    const token = this.generation;
    try {
      const buffer = await this.buffer(id);
      if (!this.playing || token !== this.generation || !(id in this.mix) || this.nodes.has(id)) return;
      const gain = this.context.createGain(), mode = configForSound(id).mode;
      gain.gain.value = 0; gain.connect(this.mixBus);
      const layer = { gain, mode, sources: new Set(), timer: null, started: this.context.currentTime };
      this.nodes.set(id, layer); gain.gain.linearRampToValueAtTime(this.level(id), this.context.currentTime + .8);
      if (mode === 'event') this.scheduleAccent(id, layer, buffer);
      else this.createSource(id, buffer, layer);
      this.errors.delete(id); this.emit();
    } catch (error) { if (this.playing && token === this.generation && id in this.mix) { this.errors.set(id, error.message); this.emit(); } }
  }
  stopNode(id, seconds = .5) {
    const layer = this.nodes.get(id); if (!layer) return;
    clearTimeout(layer.timer); this.nodes.delete(id); const now = this.context.currentTime;
    this.fading.add(layer);
    layer.gain.gain.cancelScheduledValues(now); layer.gain.gain.setValueAtTime(layer.gain.gain.value, now); layer.gain.gain.linearRampToValueAtTime(0, now + seconds);
    for (const source of layer.sources) { try { source.stop(now + seconds + .03); } catch {} }
    layer.cleanup = setTimeout(() => { layer.gain.disconnect(); this.fading.delete(layer); }, (seconds + .1) * 1000);
  }
  finishFades() {
    if (!this.context) return; const now=this.context.currentTime;
    for (const layer of this.fading) {
      clearTimeout(layer.cleanup);layer.gain.gain.cancelScheduledValues(now);layer.gain.gain.setValueAtTime(layer.gain.gain.value,now);layer.gain.gain.linearRampToValueAtTime(0,now+.1);
      for(const source of layer.sources)try{source.stop(now+.12);}catch{}
      setTimeout(()=>layer.gain.disconnect(),160);
    }
    this.fading.clear();
  }
  async play() {
    if (!Object.keys(this.mix).length) return;
    try {
      this.init(); this.finishFades(); this.stopPreview(); this.playing = true; const token = ++this.generation;
      await this.context.resume(); if (!this.playing || token !== this.generation) return;
      this.output.gain.setTargetAtTime(this.master, this.context.currentTime, .08);
      this.emit(); await Promise.all(Object.keys(this.mix).map(id => this.startLayer(id)));
    } catch (error) { this.pause(); throw error; }
  }
  pause(seconds = .5) {
    this.stopPreview(); this.playing = false; ++this.generation;
    for (const id of this.nodes.keys()) this.stopNode(id, seconds);
    this.emit();
  }
  setMix(mix) {
    this.finishFades(); this.stopPreview(); this.mix = { ...mix }; ++this.generation; this.errors.clear();
    for (const id of this.nodes.keys()) if (!(id in this.mix)) this.stopNode(id, .9);
    for (const [id, volume] of Object.entries(this.mix)) {
      if (this.nodes.has(id)) this.setVolume(id, volume, false);
      else if (this.playing) void this.startLayer(id);
    }
    if (!Object.keys(this.mix).length) this.pause();
    this.trimBuffers(); this.emit();
  }
  setVolume(id, value, emit = true) {
    if (!(id in this.mix)) return; this.mix[id] = Math.max(0, Math.min(1, value));
    const layer = this.nodes.get(id); if (layer) layer.gain.gain.setTargetAtTime(this.level(id), this.context.currentTime, .08);
    if (emit) this.emit();
  }
  setMaster(value) { this.master = Math.max(0, Math.min(1, value)); if (this.output) this.output.gain.setTargetAtTime(this.master, this.context.currentTime, .08); this.emit(); }
  retry(id) { this.errors.delete(id); if (this.playing) void this.startLayer(id); else this.play().catch(() => this.emit()); }
  recover() {
    if (!this.playing) return;
    if (this.context?.state !== 'running') void this.context?.resume().catch(() => {});
    for (const id of Object.keys(this.mix)) if (!this.nodes.has(id) && !this.pending.has(id)) this.retry(id);
  }
  async preview(id) {
    if (this.previewId === id) { this.stopPreview(); return; }
    this.init(); this.stopPreview(); const token = ++this.previewToken;
    this.previewId = id; this.emit();
    try {
      await this.context.resume(); const buffer = await this.buffer(id);
      if (token !== this.previewToken || this.previewId !== id) return;
      const gain = this.context.createGain(), source = this.context.createBufferSource();
      gain.gain.value = 0; gain.connect(this.output); source.buffer = buffer; source.connect(gain);
      const now = this.context.currentTime, duration = Math.min(buffer.duration, 7);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.5 * (this.calibration.get(id)?.correction || 1), now + .2);
      gain.gain.setValueAtTime(.5 * (this.calibration.get(id)?.correction || 1), now + Math.max(.2, duration - .3)); gain.gain.linearRampToValueAtTime(0, now + duration);
      this.mixBus.gain.setTargetAtTime(0, now, .1); this.previewNode = { source, gain };
      source.onended = () => { source.disconnect(); gain.disconnect(); if (token === this.previewToken) { this.previewNode = null; this.previewId = null; this.mixBus.gain.setTargetAtTime(1, this.context.currentTime, .15); this.emit(); } };
      source.start(); source.stop(now + duration); this.emit();
    } catch (error) { if (token === this.previewToken) this.stopPreview(); throw error; }
  }
  stopPreview() {
    ++this.previewToken; this.previewId = null;
    if (this.previewNode) { const { source, gain } = this.previewNode; try { gain.gain.setTargetAtTime(0, this.context.currentTime, .04); source.stop(this.context.currentTime + .15); } catch {} this.previewNode = null; }
    if (this.mixBus) this.mixBus.gain.setTargetAtTime(1, this.context.currentTime, .15);
    this.emit();
  }
  get loading() { return [...this.pending.keys()].filter(id => id in this.mix); }
}
