/* A small reedy synth voice so you can hear what you are fingering. */

export class SaxSynth {
  constructor() {
    this.context = null;
    this.master = null;
    this.active = new Set();
  }

  resume() {
    if (!this.context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
    return this.context;
  }

  get now() {
    return this.resume().currentTime;
  }

  static frequency(midi) {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  /** Schedule one note. `at` is an absolute AudioContext time. */
  note(midi, at, duration, velocity = 0.9) {
    const ctx = this.resume();
    const length = Math.max(0.09, Math.min(duration, 8));
    const freq = SaxSynth.frequency(midi);

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(freq * 1.6, at);
    filter.frequency.linearRampToValueAtTime(freq * 5.5, at + 0.06);
    filter.frequency.linearRampToValueAtTime(freq * 3.2, at + length);

    const body = ctx.createOscillator();
    body.type = 'sawtooth';
    body.frequency.setValueAtTime(freq * 0.995, at);
    const reed = ctx.createOscillator();
    reed.type = 'square';
    reed.frequency.setValueAtTime(freq, at);
    const reedGain = ctx.createGain();
    reedGain.gain.value = 0.18;

    // A touch of vibrato, delayed like a real player would.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, at);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.006, at + Math.min(0.35, length));
    lfo.connect(lfoGain);
    lfoGain.connect(body.frequency);
    lfoGain.connect(reed.frequency);

    const attack = 0.028;
    const release = 0.09;
    const peak = 0.28 * velocity;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + attack);
    gain.gain.linearRampToValueAtTime(peak * 0.78, at + Math.min(length * 0.6, attack + 0.25));
    gain.gain.setTargetAtTime(0.0001, at + Math.max(length - release, attack), 0.04);

    body.connect(filter);
    reed.connect(reedGain);
    reedGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    const stopAt = at + length + 0.25;
    for (const node of [body, reed, lfo]) {
      node.start(at);
      node.stop(stopAt);
      this.active.add(node);
      node.onended = () => this.active.delete(node);
    }
  }

  click(at, accent = false) {
    const ctx = this.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 1100;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(accent ? 0.16 : 0.09, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(at);
    osc.stop(at + 0.07);
    this.active.add(osc);
    osc.onended = () => this.active.delete(osc);
  }

  stopAll() {
    for (const node of this.active) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    this.active.clear();
  }
}
