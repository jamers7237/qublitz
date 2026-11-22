import type { InstrumentId } from '../quantum/codebook';

/**
 * Original synthesized timbres (no samples). Each voice ends exactly at `dur`
 * seconds so note lengths stay audible for every instrument.
 */
const pulseCache = new WeakMap<BaseAudioContext, PeriodicWave>();
function pulseWave(ctx: BaseAudioContext): PeriodicWave {
  let w = pulseCache.get(ctx);
  if (!w) {
    const N = 48, duty = 0.25;
    const real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    w = ctx.createPeriodicWave(real, imag);
    pulseCache.set(ctx, w);
  }
  return w;
}

function osc(ctx: BaseAudioContext, type: OscillatorType | PeriodicWave, freq: number, when: number, stop: number, dest: AudioNode, gain: number, detune = 0) {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type as OscillatorType;
  else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(freq, when);
  o.detune.setValueAtTime(detune, when);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(stop + 0.05);
  return { o, g };
}

export function synthNote(ctx: BaseAudioContext, out: AudioNode, instrument: InstrumentId, freq: number, dur: number, when: number, velocity = 1) {
  const env = ctx.createGain();
  const end = when + dur;
  const rel = Math.min(0.08, dur * 0.3);
  env.gain.setValueAtTime(0.0001, when);
  const peak = 0.32 * velocity;

  switch (instrument) {
    case 'piano': {
      // Velvet felt piano: soft attack, damped harmonics, muffled
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, when);
      lp.frequency.exponentialRampToValueAtTime(700, when + Math.min(1.2, dur));
      env.connect(lp).connect(out);
      env.gain.exponentialRampToValueAtTime(peak, when + 0.012);
      env.gain.exponentialRampToValueAtTime(peak * 0.35, when + Math.min(0.35, dur * 0.7));
      env.gain.setValueAtTime(peak * 0.35, Math.max(when + 0.02, end - rel));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      osc(ctx, 'triangle', freq, when, end, env, 0.9);
      osc(ctx, 'sine', freq * 2, when, end, env, 0.35, 3);
      osc(ctx, 'sine', freq * 3, when, end, env, 0.12, -4);
      osc(ctx, 'sine', freq * 4.01, when, Math.min(end, when + 0.15), env, 0.06);
      break;
    }
    case 'celesta': {
      // Music box: bright bell partials (slightly inharmonic) over the fundamental
      env.connect(out);
      env.gain.exponentialRampToValueAtTime(peak * 0.9, when + 0.004);
      env.gain.exponentialRampToValueAtTime(peak * 0.25, when + Math.min(0.6, dur * 0.8));
      env.gain.setValueAtTime(peak * 0.25, Math.max(when + 0.01, end - rel));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      osc(ctx, 'sine', freq, when, end, env, 0.45);
      osc(ctx, 'sine', freq * 2, when, end, env, 0.55);
      osc(ctx, 'sine', freq * 4, when, end, env, 0.5);
      osc(ctx, 'sine', freq * 5.43, when, Math.min(end, when + 0.5), env, 0.18);
      osc(ctx, 'sine', freq * 8, when, Math.min(end, when + 0.25), env, 0.12);
      break;
    }
    case 'cello': {
      // Pizzicato cello: plucked saw through a closing low-pass, rounded body
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(2600, when);
      lp.frequency.exponentialRampToValueAtTime(320, when + Math.min(0.25, dur * 0.6));
      const body = ctx.createBiquadFilter();
      body.type = 'peaking';
      body.frequency.value = 220;
      body.gain.value = 6;
      env.connect(lp).connect(body).connect(out);
      env.gain.exponentialRampToValueAtTime(peak * 1.1, when + 0.005);
      env.gain.exponentialRampToValueAtTime(peak * 0.3, when + Math.min(0.3, dur * 0.6));
      env.gain.setValueAtTime(peak * 0.3, Math.max(when + 0.01, end - rel));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      osc(ctx, 'sawtooth', freq, when, end, env, 0.55);
      osc(ctx, 'triangle', freq / 2, when, end, env, 0.35);
      break;
    }
    case 'pulse': {
      // Retro pulse synth: 25% duty, crisp square character, light vibrato
      env.connect(out);
      env.gain.exponentialRampToValueAtTime(peak * 0.45, when + 0.006);
      env.gain.setValueAtTime(peak * 0.38, Math.max(when + 0.01, end - rel));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      const { o } = osc(ctx, pulseWave(ctx), freq, when, end, env, 0.8);
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = dur > 0.6 ? 6 : 0;
      lfo.connect(lg).connect(o.detune);
      lfo.start(when + 0.2);
      lfo.stop(end + 0.05);
      osc(ctx, 'square', freq * 2, when, end, env, 0.07, 7);
      break;
    }
  }
}
