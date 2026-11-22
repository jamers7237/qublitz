import Phaser from 'phaser';
import assetFiles from 'virtual:asset-files';
import { MANIFEST } from '../../assets/manifest';
import { PROCEDURAL, compositeUnresolved } from '../../assets/procedural';

export const loadReport: { loaded: string[]; failed: string[]; procedural: string[] } = { loaded: [], failed: [], procedural: [] };

/** Returns `url?v=mtime` when a teammate file exists in /public, else null. */
export function existingAssetUrl(url?: string): string | null {
  if (!url) return null;
  const m = (assetFiles as Record<string, number>)[url];
  return m ? `${url}?v=${m}` : null;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      loadReport.failed.push(file.key);
      console.warn(`[assets] failed to load ${file.key} (${file.url}); using procedural fallback`);
    });
    for (const a of MANIFEST) {
      const url = existingAssetUrl(a.url);
      if (!url) continue;
      if (a.kind === 'image') this.load.image(a.id, url);
      if (a.kind === 'spritesheet') this.load.spritesheet(a.id, url, { frameWidth: a.frameWidth!, frameHeight: a.frameHeight! });
    }
  }

  create() {
    const unresolved: typeof MANIFEST[number][] = [];
    for (const a of MANIFEST) {
      if (a.kind !== 'image' && a.kind !== 'spritesheet') continue;
      if (this.textures.exists(a.id)) {
        loadReport.loaded.push(a.id);
        continue;
      }
      if (a.id.endsWith('.unresolved')) {
        unresolved.push(a);
        continue;
      }
      const draw = PROCEDURAL[a.id];
      const canvas = document.createElement('canvas');
      canvas.width = a.width;
      canvas.height = a.height;
      const g = canvas.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      if (draw) draw(g, a.width, a.height);
      else {
        // honest "missing art" marker rather than a crash
        g.fillStyle = '#e46b8f';
        g.fillRect(0, 0, a.width, a.height);
        g.fillStyle = '#0a0814';
        g.fillRect(1, 1, a.width - 2, a.height - 2);
        console.warn(`[assets] no procedural drawer for ${a.id}`);
      }
      const tex = this.textures.addCanvas(a.id, canvas)!;
      if (a.kind === 'spritesheet') {
        const fw = a.frameWidth!, fh = a.frameHeight!;
        let i = 0;
        for (let y = 0; y + fh <= a.height; y += fh) for (let x = 0; x + fw <= a.width; x += fw) tex.add(i++, 0, x, y, fw, fh);
      }
      loadReport.procedural.push(a.id);
    }
    // ECHO-timeline shimmer variants are composited from both physical states unless supplied.
    for (const a of unresolved) {
      const base = a.id.replace(/\.unresolved$/, '');
      const states = MANIFEST.filter((m) => m.id.startsWith(base + '.') && !m.id.endsWith('.unresolved')).map((m) => m.id);
      const canvas = document.createElement('canvas');
      canvas.width = a.width;
      canvas.height = a.height;
      const g = canvas.getContext('2d')!;
      if (states.length >= 2) {
        const src = (k: string) => this.textures.get(k).getSourceImage() as CanvasImageSource;
        compositeUnresolved(g, a.width, a.height, src(states[0]), src(states[1]));
      }
      this.textures.addCanvas(a.id, canvas);
      loadReport.procedural.push(a.id);
    }
    // lighting helpers
    this.makeVignette();
    this.makeGlow();
    this.scene.start('world');
  }

  private makeVignette() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 288;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(256, 150, 60, 256, 150, 330);
    grd.addColorStop(0, 'rgba(8,6,20,0)');
    grd.addColorStop(1, 'rgba(8,6,20,1)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 288);
    this.textures.addCanvas('fx.vignette', c);
  }

  private makeGlow() {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(48, 48, 2, 48, 48, 48);
    grd.addColorStop(0, 'rgba(255,214,140,0.55)');
    grd.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 96, 96);
    this.textures.addCanvas('fx.glow', c);
  }
}
