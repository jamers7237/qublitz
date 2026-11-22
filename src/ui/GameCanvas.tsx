import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { BootScene } from '../game/scenes/BootScene';
import { WorldScene } from '../game/scenes/WorldScene';

export const WORLD_W = 512;
export const WORLD_H = 288;

/** Integer zoom when possible (crisp pixels), fractional only when the window is smaller than 1x. */
export function computeZoom(w: number, h: number): number {
  const fit = Math.min(w / WORLD_W, h / WORLD_H);
  return fit >= 1 ? Math.max(1, Math.floor(fit)) : Math.max(0.5, fit);
}

/**
 * Landscape: the whole 512x288 room, letterboxed at integer zoom.
 * Portrait phones: a narrower 288px-wide camera window that follows the player,
 * so pixels stay large enough to read and tap.
 */
export function computeLayout(w: number, h: number) {
  if (w < 700 && h > w * 1.1) {
    const lw = 288;
    const zoom = w / lw;
    const lh = Math.min(WORLD_H, Math.floor((h * 0.56) / zoom));
    return { zoom, lw, lh, portrait: true };
  }
  return { zoom: computeZoom(w, h), lw: WORLD_W, lh: WORLD_H, portrait: false };
}

export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const initial = computeLayout(window.innerWidth, window.innerHeight);
    ref.current.classList.toggle('portrait', initial.portrait);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      width: initial.lw,
      height: initial.lh,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#07060f',
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.NONE, zoom: initial.zoom },
      audio: { noAudio: true },
      input: { keyboard: { capture: [] } },
      scene: [BootScene, WorldScene],
    });
    (window as any).__game = game;
    const onResize = () => {
      const l = computeLayout(window.innerWidth, window.innerHeight);
      ref.current?.classList.toggle('portrait', l.portrait);
      game.scale.resize(l.lw, l.lh);
      game.scale.setZoom(l.zoom);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      game.destroy(true);
      delete (window as any).__game;
    };
  }, []);
  return <div className="stage" ref={ref} data-testid="stage" />;
}

export function worldScene(): WorldScene | null {
  const g = (window as any).__game as Phaser.Game | undefined;
  return (g?.scene.getScene('world') as WorldScene) ?? null;
}
