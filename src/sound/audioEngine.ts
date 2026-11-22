import { decode } from '../quantum/codebook';
import type { Settings } from '../state/types';
import { synthNote } from './instruments';

export type SfxName =
  | 'blip' | 'clickL' | 'clickR' | 'knock' | 'click' | 'lever' | 'rewind' | 'static' | 'pickup'
  | 'deliver' | 'error' | 'success' | 'door' | 'tick' | 'unlock' | 'hover' | 'toast' | 'page' | 'mirror' | 'ding';

type Ctx = AudioContext;

class AudioEngine {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfxBus!: GainNode;
  private notes!: GainNode;
  private ambient: { stop: () => void } | null = null;
  private settings: Settings | null = null;
  private noiseBuf: AudioBuffer | null = null;
  ambientUrl: string | null = null;

  get available() {
    return typeof window !== 'undefined' && (typeof AudioContext !== 'undefined' || 'webkitAudioContext' in window);
  }

  /** Must be called from a user gesture at least once (browser autoplay policy). */
  ensure(): boolean {
    if (!this.available) return false;
    if (!this.ctx) {
      const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.notes = this.ctx.createGain();
      // gentle shared reverb-ish delay for atmosphere
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = 0.23;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.22;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.18;
      this.notes.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(wet).connect(this.master);
      this.music.connect(this.master);
      this.sfxBus.connect(this.master);
      this.notes.connect(this.master);
      if (this.settings) this.applySettings(this.settings);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  applySettings(s: Settings) {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
    this.music.gain.setTargetAtTime(s.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.notes.gain.setTargetAtTime(s.notes, t, 0.05);
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Play a decoded 8-bit event. Returns its duration in seconds. Pure playback — never a measurement. */
  playEvent(index: number, delay = 0, velocity = 1): number {
    const d = decode(index);
    if (!this.ensure() || !this.ctx) return d.duration.seconds;
    synthNote(this.ctx, this.notes, d.instrument.id, d.pitch.freq, d.duration.seconds, this.now() + 0.02 + delay, velocity);
    return d.duration.seconds;
  }

  /** Play a sequence of events back-to-back, optionally followed by a closing chord. */
  playMelody(indices: number[], chord?: 'major' | 'minor', gap = 0.04): number {
    let t = 0;
    for (const i of indices) {
      t += this.playEvent(i, t) + gap;
    }
    if (chord) {
      this.playChord(chord, t + 0.1);
      t += 3.2;
    }
    return t;
  }

  playChord(kind: 'major' | 'minor', delay = 0) {
    if (!this.ensure() || !this.ctx) return;
    const C4 = 261.6256, E4 = 329.6276, Eb4 = 311.127, G4 = 391.9954, C3 = 130.8128;
    const freqs = [C3, C4, kind === 'major' ? E4 : Eb4, G4];
    const when = this.now() + 0.02 + delay;
    freqs.forEach((f, k) => {
      synthNote(this.ctx!, this.notes, 'piano', f, 3, when + k * 0.03, 0.7);
      synthNote(this.ctx!, this.notes, 'celesta', f, 2.5, when + 0.05 + k * 0.03, 0.25);
    });
  }

  /** Ghost tones for the X-basis echo experiment. */
  playEcho(bit: 0 | 1, delay = 0) {
    if (!this.ensure() || !this.ctx) return;
    const ctx = this.ctx;
    const when = this.now() + 0.02 + delay;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.28, when + 0.25);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 2.4);
    env.connect(this.notes);
    if (bit === 0) {
      // hollow echo: low breathy tone with tremolo
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 196;
      bp.Q.value = 6;
      const n = ctx.createBufferSource();
      n.buffer = this.noise();
      n.connect(bp).connect(env);
      n.start(when);
      n.stop(when + 2.5);
      for (const f of [98, 147]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        const trem = ctx.createOscillator();
        trem.frequency.value = 4;
        const tg = ctx.createGain();
        tg.gain.value = 0.35;
        trem.connect(tg).connect(g.gain);
        o.connect(g).connect(env);
        o.start(when);
        trem.start(when);
        o.stop(when + 2.5);
        trem.stop(when + 2.5);
      }
    } else {
      // bright echo: shimmering high partials with vibrato
      for (const [f, a] of [[784, 0.35], [1175, 0.25], [1568, 0.18], [2349, 0.08]] as const) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const vib = ctx.createOscillator();
        vib.frequency.value = 6.5;
        const vg = ctx.createGain();
        vg.gain.value = 9;
        vib.connect(vg).connect(o.detune);
        const g = ctx.createGain();
        g.gain.value = a;
        o.connect(g).connect(env);
        o.start(when);
        vib.start(when);
        o.stop(when + 2.5);
        vib.stop(when + 2.5);
      }
    }
  }

  private noise(): AudioBuffer {
    if (!this.noiseBuf && this.ctx) {
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf!;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.12, delay = 0, slideTo?: number) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, freq: number, q = 1, gain = 0.3, delay = 0, type: BiquadFilterType = 'bandpass') {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise();
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(this.sfxBus);
    n.start(t, Math.random());
    n.stop(t + dur + 0.02);
  }

  sfx(name: SfxName) {
    if (!this.ensure() || !this.ctx) return;
    switch (name) {
      case 'blip': this.tone(520 + Math.random() * 40, 0.04, 'square', 0.03); break;
      case 'hover': this.tone(1200, 0.03, 'sine', 0.025); break;
      case 'clickL': this.tone(180, 0.06, 'square', 0.07); this.burst(0.03, 900, 3, 0.1); break;
      case 'clickR': this.tone(420, 0.05, 'square', 0.07); this.burst(0.03, 2400, 3, 0.1); break;
      case 'knock': this.burst(0.08, 140, 2, 0.25, 0, 'lowpass'); this.tone(70, 0.08, 'sine', 0.12); break;
      case 'click': this.burst(0.025, 3000, 4, 0.12); break;
      case 'lever': this.burst(0.05, 600, 3, 0.2); this.tone(220, 0.12, 'triangle', 0.08, 0.05, 160); break;
      case 'door': this.burst(0.12, 400, 1, 0.12, 0, 'lowpass'); break;
      case 'tick': this.burst(0.02, 4000, 8, 0.1); break;
      case 'pickup': this.tone(660, 0.08, 'square', 0.06); this.tone(990, 0.12, 'square', 0.06, 0.07); break;
      case 'deliver': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.08, i * 0.08)); break;
      case 'error': this.tone(200, 0.15, 'sawtooth', 0.05, 0, 140); break;
      case 'success': [392, 523, 659].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.09, i * 0.09)); break;
      case 'unlock': this.burst(0.05, 1500, 5, 0.2); this.tone(880, 0.25, 'sine', 0.08, 0.06); this.tone(1320, 0.3, 'sine', 0.06, 0.12); break;
      case 'toast': this.tone(880, 0.06, 'sine', 0.05); break;
      case 'page': this.burst(0.09, 2500, 0.7, 0.08, 0, 'highpass'); break;
      case 'mirror': this.tone(1568, 0.2, 'sine', 0.05); this.tone(2093, 0.25, 'sine', 0.04, 0.05); break;
      case 'ding': this.tone(1760, 0.6, 'sine', 0.1); this.tone(2640, 0.4, 'sine', 0.05); break;
      case 'static': this.burst(0.9, 2000, 0.3, 0.18, 0, 'highpass'); break;
      case 'rewind':
        this.burst(1.2, 1200, 0.5, 0.2);
        this.tone(900, 1.1, 'sawtooth', 0.04, 0, 90);
        this.tone(600, 1.1, 'sine', 0.06, 0.1, 1800);
        break;
    }
  }

  /** Original ambient C-centred drone (or a teammate-supplied loop if present). */
  startAmbient() {
    if (!this.ensure() || !this.ctx || this.ambient) return;
    const ctx = this.ctx;
    if (this.ambientUrl) {
      const el = new Audio(this.ambientUrl);
      el.loop = true;
      const src = ctx.createMediaElementSource(el);
      src.connect(this.music);
      el.play().catch(() => {});
      this.ambient = { stop: () => el.pause() };
      return;
    }
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    out.connect(lp).connect(this.music);
    const nodes: OscillatorNode[] = [];
    for (const [f, g, det] of [[65.41, 0.5, 0], [98.0, 0.3, 4], [130.81, 0.18, -6], [196.0, 0.06, 3]] as const) {
      const o = ctx.createOscillator();
      o.type = f > 150 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = det;
      const gg = ctx.createGain();
      gg.gain.value = g;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lg = ctx.createGain();
      lg.gain.value = g * 0.5;
      lfo.connect(lg).connect(gg.gain);
      o.connect(gg).connect(out);
      o.start();
      lfo.start();
      nodes.push(o, lfo);
    }
    this.ambient = {
      stop: () => {
        out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
        nodes.forEach((n) => n.stop(ctx.currentTime + 2));
      },
    };
  }

  stopAmbient() {
    this.ambient?.stop();
    this.ambient = null;
  }
}

export const audio = new AudioEngine();
