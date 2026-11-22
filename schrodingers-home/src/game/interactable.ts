import Phaser from 'phaser';
import type { PlacedObject } from '../data/roomLayouts';
import type { InteractableDef } from '../data/interactables';

/**
 * ONE reusable interaction component for every actionable sprite.
 *
 * - The white outline + translucent silhouette are generated from the CURRENT
 *   texture's alpha at runtime and live in separate overlay images, so a
 *   teammate's replacement PNG automatically inherits the affordance.
 * - The clickable hitbox comes from the room layout, not the art size.
 * - Decor objects never get a hitbox or highlight.
 */
export function ensureHighlightTextures(scene: Phaser.Scene, key: string): { ring: string; fill: string } {
  const ring = `${key}__ring`;
  const fill = `${key}__fill`;
  if (scene.textures.exists(ring)) return { ring, fill };
  const tex = scene.textures.get(key);
  const frame = tex.get(0) ?? tex.get();
  const w = frame.cutWidth, h = frame.cutHeight;
  const src = tex.getSourceImage() as CanvasImageSource;
  // silhouette
  const sil = document.createElement('canvas');
  sil.width = w + 2;
  sil.height = h + 2;
  const sg = sil.getContext('2d')!;
  sg.drawImage(src, frame.cutX, frame.cutY, w, h, 1, 1, w, h);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#ffffff';
  sg.fillRect(0, 0, w + 2, h + 2);
  // ring = silhouette dilated by 1px minus the silhouette
  const rc = document.createElement('canvas');
  rc.width = w + 2;
  rc.height = h + 2;
  const rg = rc.getContext('2d')!;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) rg.drawImage(sil, dx, dy);
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(sil, 0, 0);
  scene.textures.addCanvas(ring, rc);
  scene.textures.addCanvas(fill, sil);
  return { ring, fill };
}

export interface ViewCallbacks {
  onOver(view: InteractableView): void;
  onOut(view: InteractableView): void;
  onDown(view: InteractableView): void;
}

export class InteractableView {
  readonly sprite: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  readonly fill: Phaser.GameObjects.Image;
  readonly zone: Phaser.GameObjects.Zone | null;
  key: string;
  locked = false;
  private hovered = false;
  private focused = false;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(
    private scene: Phaser.Scene,
    readonly placed: PlacedObject,
    readonly def: InteractableDef | null,
    key: string,
    cb: ViewCallbacks | null,
  ) {
    this.key = key;
    this.sprite = scene.add.image(placed.x, placed.y, key);
    const { ring, fill } = ensureHighlightTextures(scene, key);
    this.ring = scene.add.image(placed.x, placed.y, ring).setVisible(false);
    this.fill = scene.add.image(placed.x, placed.y, fill).setVisible(false).setAlpha(0.18);
    this.applyOrigin();
    this.setDepth();
    if (def && cb) {
      const [hw, hh] = placed.hit ?? [this.sprite.width, this.sprite.height];
      const pad = 4;
      const cy = placed.y + (placed.hitOffsetY ?? 0) - hh / 2;
      this.zone = scene.add.zone(placed.x, cy, hw + pad * 2, hh + pad * 2).setInteractive({ useHandCursor: true });
      this.zone.setDepth(this.sprite.depth + 0.5);
      this.zone.on('pointerover', () => cb.onOver(this));
      this.zone.on('pointerout', () => cb.onOut(this));
      this.zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button === 0) cb.onDown(this);
      });
    } else this.zone = null;
  }

  private applyOrigin() {
    // Anchor: bottom-centre. Overlays are 2px larger (1px border each side).
    const w = this.sprite.width, h = this.sprite.height;
    this.sprite.setOrigin(0.5, 1);
    this.ring.setOrigin((w / 2 + 1) / (w + 2), (h + 1) / (h + 2));
    this.fill.setOrigin((w / 2 + 1) / (w + 2), (h + 1) / (h + 2));
  }

  private setDepth() {
    const p = this.placed;
    const d = p.layer === 'wall' ? 5 + p.y / 1000 : p.y + (p.depthBias ?? 0);
    this.sprite.setDepth(d);
    this.fill.setDepth(d + 0.01);
    this.ring.setDepth(d + 0.02);
  }

  /** Hitbox rect in world px (for proximity + debug). */
  hitRect(): Phaser.Geom.Rectangle {
    const p = this.placed;
    const [hw, hh] = p.hit ?? [this.sprite.width, this.sprite.height];
    return new Phaser.Geom.Rectangle(p.x - hw / 2, p.y + (p.hitOffsetY ?? 0) - hh, hw, hh);
  }

  setTextureKey(key: string) {
    if (key === this.key) return;
    this.key = key;
    this.sprite.setTexture(key);
    const { ring, fill } = ensureHighlightTextures(this.scene, key);
    this.ring.setTexture(ring);
    this.fill.setTexture(fill);
    this.applyOrigin();
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    this.sprite.setTint(locked ? 0x8c86a8 : 0xffffff);
    this.updateHighlight();
  }

  setHovered(v: boolean) {
    this.hovered = v;
    this.updateHighlight();
  }

  setFocused(v: boolean) {
    if (this.focused === v) return;
    this.focused = v;
    this.updateHighlight();
  }

  get highlighted() {
    return this.hovered || this.focused;
  }

  private updateHighlight() {
    const on = this.highlighted && !!this.def;
    this.ring.setVisible(on);
    this.fill.setVisible(on);
    // locked gadgets: dimmer, grey-white outline; actionable: crisp white
    this.ring.setTint(this.locked ? 0xb8b4cc : 0xffffff);
    this.ring.setAlpha(this.locked ? 0.7 : 1);
    if (on && !this.pulse) {
      this.pulse = this.scene.tweens.add({ targets: this.fill, alpha: { from: 0.1, to: 0.26 }, duration: 520, yoyo: true, repeat: -1 });
    } else if (!on && this.pulse) {
      this.pulse.stop();
      this.pulse = null;
      this.fill.setAlpha(0.18);
    }
  }

  flash() {
    this.fill.setVisible(true).setAlpha(0.9);
    this.scene.tweens.add({
      targets: this.fill,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => this.updateHighlight(),
    });
  }

  destroy() {
    this.pulse?.stop();
    this.sprite.destroy();
    this.ring.destroy();
    this.fill.destroy();
    this.zone?.destroy();
  }
}
