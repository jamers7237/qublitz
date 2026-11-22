import Phaser from 'phaser';
import { interactableById } from '../../data/interactables';
import { ROOMS, wallRects, type PlacedObject, type RoomLayout } from '../../data/roomLayouts';
import { assetById } from '../../assets/manifest';
import { decode } from '../../quantum/codebook';
import { audio } from '../../sound/audioEngine';
import { gameStore, isUIBlocking, settingsStore, uiStore } from '../../state/store';
import type { GameState, RoomId } from '../../state/types';
import { bus, touchInput } from '../bus';
import { InteractableView, type ViewCallbacks } from '../interactable';
import { interact } from '../interactions';

const DIRS = ['down', 'left', 'right', 'up'] as const;
const INSTRUMENT_TINT: Record<string, number> = { piano: 0xf1ead8, celesta: 0x6ff3ff, cello: 0xf2c46d, pulse: 0xe46b8f };

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private views: InteractableView[] = [];
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private room!: RoomLayout;
  private facing: (typeof DIRS)[number] = 'up';
  private focused: InteractableView | null = null;
  private hovered: InteractableView | null = null;
  private transitioning = false;
  private doorCooldownUntil = 0;
  private lastPromptKey = '';
  private debugGfx!: Phaser.GameObjects.Graphics;
  private echoTint!: Phaser.GameObjects.Rectangle;
  private unsubs: (() => void)[] = [];
  private ambientTimers: Phaser.Time.TimerEvent[] = [];
  private lastState: GameState | null = null;
  private glows = new Map<InteractableView, Phaser.GameObjects.Image>();

  constructor() {
    super('world');
  }

  create() {
    this.makeAnimations();
    this.walls = this.physics.add.staticGroup();
    const s = gameStore.get();
    this.player = this.physics.add.sprite(256, 200, 'player', 0).setOrigin(0.5, 1);
    const fw = this.player.frame.width, fh = this.player.frame.height;
    this.player.body!.setSize(Math.max(6, fw * 0.62), 6);
    this.player.body!.setOffset((fw - Math.max(6, fw * 0.62)) / 2, fh - 6);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, 512, 288);
    this.physics.add.collider(this.player, this.walls);

    const kb = this.input.keyboard!;
    // enableCapture=false so typing in React inputs (House Manual, name entry) is never swallowed
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER', false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.disableGlobalCapture();
    kb.on('keydown-E', () => this.tryInteract());
    kb.on('keydown-SPACE', () => this.tryInteract());

    this.debugGfx = this.add.graphics().setDepth(10000);
    const vignette = this.add.image(0, 0, 'fx.vignette').setOrigin(0).setDepth(9000).setAlpha(0.65).setScrollFactor(0);
    const fitVignette = () => vignette.setDisplaySize(this.scale.width, this.scale.height);
    fitVignette();
    this.scale.on('resize', fitVignette);
    // camera follows the player; on the full 512x288 view the bounds keep it still
    this.cameras.main.setBounds(0, 0, 512, 288);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.echoTint = this.add.rectangle(0, 0, 512, 288, 0x6ff3ff, 0).setOrigin(0).setDepth(8999).setBlendMode(Phaser.BlendModes.ADD);

    this.buildRoom(s.room, s.spawn);

    this.unsubs.push(
      gameStore.subscribe(() => this.refreshVisuals()),
      uiStore.subscribe(() => this.drawDebug()),
      bus.on('roomChanged', ({ room, spawn }) => this.transitionTo(room, spawn)),
      bus.on('focusObject', ({ objectId }) => this.focusObject(objectId)),
      bus.on('recordPlay', ({ kind, outcome }) => this.recordFx(kind, outcome)),
      bus.on('lever', () => this.leverFx()),
      bus.on('rewind', () => this.rewindFx()),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      if (!over.length && p.button === 0) this.hover(null);
    });
  }

  // ------------------------------------------------------------ room building
  private makeAnimations() {
    const tex = this.textures.get('player');
    const frames = tex.frameTotal - 1;
    const perRow = Math.max(1, Math.floor(frames / 4));
    DIRS.forEach((d, row) => {
      if (this.anims.exists(`walk-${d}`)) return;
      this.anims.create({
        key: `walk-${d}`,
        frames: this.anims.generateFrameNumbers('player', { start: row * perRow, end: row * perRow + perRow - 1 }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  private clearRoom() {
    this.views.forEach((v) => v.destroy());
    this.views = [];
    this.roomObjects.forEach((o) => o.destroy());
    this.roomObjects = [];
    this.walls.clear(true, true);
    this.ambientTimers.forEach((t) => t.remove());
    this.ambientTimers = [];
    this.glows.forEach((g) => g.destroy());
    this.glows.clear();
    this.focused = null;
    this.hovered = null;
  }

  private buildRoom(roomId: RoomId, spawn: string) {
    this.clearRoom();
    const room = (this.room = ROOMS[roomId]);
    const [fx, fy, fw, fh] = room.floorRect;
    // background render
    const rt = this.add.renderTexture(0, 0, 512, 288).setOrigin(0).setDepth(0);
    rt.fill(0x07060f);
    for (let ty = 0; ty < 18; ty++)
      for (let tx = 0; tx < 32; tx++) {
        const inFloor = tx >= fx && tx < fx + fw && ty >= fy && ty < fy + fh;
        const inRug = room.rugs.some(([rx, ry, rw, rh]) => tx >= rx && tx < rx + rw && ty >= ry && ty < ry + rh);
        if (inFloor) rt.drawFrame(inRug ? 'tile.rug' : room.floor, undefined, tx * 16, ty * 16);
        else if (tx >= fx - 1 && tx <= fx + fw && ty < fy && ty >= 0) rt.drawFrame(ty === 0 ? 'tile.wall.cap' : 'tile.wall', undefined, tx * 16, ty * 16);
        else if ((tx === fx - 1 || tx === fx + fw) && ty >= fy && ty <= fy + fh) rt.drawFrame('tile.wall.side', undefined, tx * 16, ty * 16);
        else if (ty === fy + fh && tx >= fx - 1 && tx <= fx + fw) rt.drawFrame('tile.wall.side', undefined, tx * 16, ty * 16);
      }
    // floor shading under top wall
    const shade = this.add.rectangle(fx * 16, fy * 16, fw * 16, 6, 0x05040f, 0.45).setOrigin(0).setDepth(1);
    this.roomObjects.push(rt, shade);
    for (const [x, y, w, h] of wallRects(room)) {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(z, true);
      this.walls.add(z);
    }
    const s = gameStore.get();
    for (const placed of room.objects) this.spawnObject(placed, s);
    const [px, py] = room.spawns[spawn] ?? room.spawns.center ?? [256, 180];
    this.player.setPosition(px, py);
    this.player.body!.reset(px, py);
    this.player.setDepth(py);
    this.cameras.main.centerOn(px, py);
    this.doorCooldownUntil = this.time.now + 350;
    this.refreshVisuals(true);
    this.drawDebug();
  }

  private callbacks: ViewCallbacks = {
    onOver: (v) => this.hover(v),
    onOut: (v) => {
      if (this.hovered === v) this.hover(null);
    },
    onDown: (v) => {
      // mouse/touch: the dialogue box is a DOM layer above the canvas, so no debounce is needed
      if (this.canAct(false)) {
        this.hover(v);
        interact(v.placed.id);
      }
    },
  };

  private spawnObject(placed: PlacedObject, s: GameState) {
    if (placed.decor) {
      const v = new InteractableView(this, placed, null, placed.asset!, null);
      if (placed.solid) this.addSolid(placed);
      this.views.push(v);
      return;
    }
    const def = interactableById(placed.id);
    if (!def) return;
    if (def.visible && !def.visible(s)) return;
    const v = new InteractableView(this, placed, def, def.asset(s), this.callbacks);
    v.setLocked(!!def.locked?.(s));
    if (placed.solid) this.addSolid(placed);
    this.views.push(v);
    this.attachAmbient(v);
  }

  private addSolid(p: PlacedObject) {
    const [w, h] = p.solid!;
    const z = this.add.zone(p.x, p.y - h / 2, w, h);
    this.physics.add.existing(z, true);
    this.walls.add(z);
  }

  /** Re-skin sensors / gadgets when state changes (texture swap only: hitboxes never move). */
  private refreshVisuals(force = false) {
    if (!this.room || this.transitioning) return;
    const s = gameStore.get();
    if (!force && s === this.lastState) return;
    this.lastState = s;
    for (const placed of this.room.objects) {
      if (placed.decor) continue;
      const def = interactableById(placed.id);
      if (!def) continue;
      const shouldShow = !def.visible || def.visible(s);
      const view = this.views.find((v) => v.placed === placed);
      if (view && !shouldShow) {
        this.glows.get(view)?.destroy();
        this.glows.delete(view);
        view.destroy();
        this.views = this.views.filter((v) => v !== view);
        if (this.focused === view) this.focused = null;
        if (this.hovered === view) this.hover(null);
      } else if (!view && shouldShow) this.spawnObject(placed, s);
      else if (view) {
        const key = def.asset(s);
        if (key !== view.key) {
          view.setTextureKey(key);
          this.attachAmbient(view);
        }
        view.setLocked(!!def.locked?.(s));
      }
    }
    const echo = s.timeline.mode === 'echo';
    this.tweens.killTweensOf(this.echoTint);
    if (echo && !settingsStore.get().reducedMotion) this.tweens.add({ targets: this.echoTint, fillAlpha: { from: 0.03, to: 0.08 }, duration: 1600, yoyo: true, repeat: -1 });
    else this.echoTint.setFillStyle(0x6ff3ff, echo ? 0.05 : 0);
  }

  /** Small ambient animations keyed off the current physical state. */
  private attachAmbient(v: InteractableView) {
    const reduced = settingsStore.get().reducedMotion;
    this.tweens.killTweensOf(v.sprite);
    v.sprite.setAlpha(1).setX(v.placed.x);
    const k = v.key;
    this.glows.get(v)?.destroy();
    this.glows.delete(v);
    if (k.endsWith('.unresolved') && !reduced) {
      this.tweens.add({ targets: v.sprite, alpha: { from: 0.65, to: 1 }, x: { from: v.placed.x - 0.5, to: v.placed.x + 0.5 }, duration: 420, yoyo: true, repeat: -1 });
    }
    if (k === 'obj.lamp.lit') {
      const glow = this.add.image(v.placed.x, v.placed.y - 18, 'fx.glow').setDepth(8998).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      this.glows.set(v, glow);
      if (!reduced) this.tweens.add({ targets: glow, alpha: { from: 0.65, to: 0.85 }, duration: 900, yoyo: true, repeat: -1 });
    }
    if (k === 'obj.hatch.open') {
      const glow = this.add.image(v.placed.x, v.placed.y - 8, 'fx.glow').setDepth(8998).setScale(0.55).setTint(0xf2c46d).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
      this.glows.set(v, glow);
      if (!reduced) this.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.4 }, duration: 1100, yoyo: true, repeat: -1 });
    }
    if (k === 'obj.clock.ticking') {
      this.ambientTimers.push(this.time.addEvent({ delay: 1000, loop: true, callback: () => v.sprite.active && v.key === 'obj.clock.ticking' && this.near(v, 60) && audio.sfx('tick') }));
    }
    if (k === 'obj.radiator.warm' && !reduced) {
      this.tweens.add({ targets: v.sprite, y: { from: v.placed.y, to: v.placed.y - 0.5 }, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  private near(v: InteractableView, d: number) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, v.placed.x, v.placed.y) < d;
  }

  // ------------------------------------------------------------ transitions & fx
  private transitionTo(room: RoomId, spawn: string) {
    const reduced = settingsStore.get().reducedMotion;
    if (reduced || !this.room) {
      this.buildRoom(room, spawn);
      return;
    }
    this.transitioning = true;
    this.cameras.main.fadeOut(110, 7, 6, 15);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.transitioning = false;
      this.buildRoom(room, spawn);
      this.cameras.main.fadeIn(160, 7, 6, 15);
    });
  }

  private viewFor(id: string) {
    return this.views.find((v) => v.placed.id === id);
  }

  private focusObject(id: string) {
    const v = this.viewFor(id);
    const reduced = settingsStore.get().reducedMotion;
    if (v) {
      v.flash();
      if (!reduced) {
        this.cameras.main.zoomTo(1.06, 220, 'Sine.easeOut', true);
        this.time.delayedCall(700, () => this.cameras.main.zoomTo(1, 300));
      }
    } else if (!reduced) this.cameras.main.shake(180, 0.002);
  }

  private recordFx(kind: 'normal' | 'echo' | 'toaster', outcome?: number) {
    const src = kind === 'toaster' ? this.viewFor('toaster') : this.viewFor('gramophone');
    if (!src) return;
    const reduced = settingsStore.get().reducedMotion;
    const count = kind === 'toaster' ? 4 : 1;
    for (let i = 0; i < count; i++) {
      const tint = kind === 'echo' ? 0x6ff3ff : outcome !== undefined ? INSTRUMENT_TINT[decode(outcome).instrument.id] : 0xf1ead8;
      const n = this.add.image(src.placed.x + 8, src.placed.y - 36, kind === 'echo' ? 'fx.ghost' : 'fx.note').setDepth(8000).setTint(tint).setAlpha(0);
      this.tweens.add({
        targets: n, delay: 600 + i * 700, alpha: { from: 1, to: 0 }, y: n.y - (reduced ? 6 : 26), x: n.x + (reduced ? 0 : Phaser.Math.Between(-6, 10)),
        duration: 1800, onComplete: () => n.destroy(),
      });
    }
    if (!reduced) this.tweens.add({ targets: src.sprite, scaleX: { from: 1, to: 1.04 }, duration: 120, yoyo: true, repeat: 3 });
  }

  private leverFx() {
    const v = this.viewFor('lever');
    if (!v) return;
    this.tweens.add({ targets: v.sprite, angle: { from: 0, to: 35 }, duration: 110, yoyo: true });
  }

  private rewindFx() {
    if (settingsStore.get().reducedMotion) return;
    this.cameras.main.flash(500, 111, 243, 255);
    this.cameras.main.shake(400, 0.006);
  }

  // ------------------------------------------------------------ input / update
  /** Keyboard actions are debounced so the E that closes a dialogue cannot re-trigger an object. */
  private canAct(keyboard = true) {
    const u = uiStore.get();
    return !this.transitioning && !isUIBlocking(u) && (!keyboard || performance.now() - u.lastClosedAt > 180);
  }

  private tryInteract() {
    if (!this.canAct()) return;
    const target = this.focused;
    if (target) interact(target.placed.id);
  }

  private hover(v: InteractableView | null) {
    if (this.hovered && this.hovered !== v) this.hovered.setHovered(false);
    this.hovered = v;
    if (v) {
      v.setHovered(true);
      audio.ctx && audio.sfx('hover');
    }
    uiStore.get().hovered !== (v?.placed.id ?? null) && uiStore.update((u) => void (u.hovered = v?.placed.id ?? null));
  }

  update() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.transitioning) {
      body.setVelocity(0);
      return;
    }
    const blocked = isUIBlocking();
    let vx = 0, vy = 0;
    if (!blocked) {
      const k = this.keys;
      vx = (k.A.isDown || k.LEFT.isDown ? -1 : 0) + (k.D.isDown || k.RIGHT.isDown ? 1 : 0) + touchInput.x;
      vy = (k.W.isDown || k.UP.isDown ? -1 : 0) + (k.S.isDown || k.DOWN.isDown ? 1 : 0) + touchInput.y;
      vx = Phaser.Math.Clamp(vx, -1, 1);
      vy = Phaser.Math.Clamp(vy, -1, 1);
    }
    if (touchInput.action) {
      touchInput.action = false;
      this.tryInteract();
    }
    const speed = 78;
    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * speed, (vy / len) * speed);
    if (vx || vy) {
      this.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      const perRow = Math.max(1, Math.floor((this.textures.get('player').frameTotal - 1) / 4));
      this.player.setFrame(DIRS.indexOf(this.facing) * perRow);
    }
    this.player.setDepth(this.player.y);

    // doorway triggers (fire once per crossing thanks to the cooldown + respawn away from the door)
    if (!blocked && this.time.now > this.doorCooldownUntil) {
      for (const d of this.room.doors) {
        const [x, y, w, h] = d.rect;
        if (this.player.x >= x && this.player.x <= x + w && this.player.y >= y && this.player.y <= y + h) {
          this.doorCooldownUntil = this.time.now + 600;
          body.setVelocity(0);
          interact(d.id);
          break;
        }
      }
    }
    this.updateFocus(blocked);
    if (uiStore.get().debugHitboxes) this.drawDebug();
  }

  /** Keyboard proximity focus: nearest actionable hitbox within reach. */
  private updateFocus(blocked: boolean) {
    let best: InteractableView | null = null;
    let bestD = Infinity;
    if (!blocked) {
      for (const v of this.views) {
        if (!v.def) continue;
        const r = v.hitRect();
        const dx = Math.max(r.x - this.player.x, 0, this.player.x - (r.x + r.width));
        const dy = Math.max(r.y - (this.player.y - 4), 0, this.player.y - 4 - (r.y + r.height));
        const d = Math.hypot(dx, dy);
        if (d <= (v.placed.reach ?? 18) && d < bestD) {
          bestD = d;
          best = v;
        }
      }
    }
    if (best !== this.focused) {
      this.focused?.setFocused(false);
      this.focused = best;
      best?.setFocused(true);
    }
    const p = this.hovered ?? this.focused;
    const key = p ? `${p.placed.id}|${p.locked}|${this.hovered ? 'm' : 'k'}|${uiStore.get().heldItem}` : '';
    if (key !== this.lastPromptKey) {
      this.lastPromptKey = key;
      uiStore.update((u) => {
        u.prompt = p && p.def ? { label: p.def.name, verb: u.heldItem && p.def.kind !== 'door' ? 'Use item on' : p.def.verb, locked: p.locked, via: this.hovered ? 'mouse' : 'key' } : null;
      });
    }
  }

  private drawDebug() {
    if (!this.debugGfx) return;
    const g = this.debugGfx;
    g.clear();
    if (!uiStore.get().debugHitboxes || !this.room) return;
    for (const [x, y, w, h] of wallRects(this.room)) {
      g.lineStyle(1, 0xff4040, 0.8).strokeRect(x, y, w, h);
    }
    for (const p of this.room.objects) {
      if (p.solid) g.lineStyle(1, 0xff8040, 0.9).strokeRect(p.x - p.solid[0] / 2, p.y - p.solid[1], p.solid[0], p.solid[1]);
    }
    for (const v of this.views) {
      if (!v.def) continue;
      const r = v.hitRect();
      g.lineStyle(1, 0xffe14d, 0.9).strokeRect(r.x, r.y, r.width, r.height);
      g.lineStyle(1, 0x5fd3c4, 0.25).strokeRect(r.x - (v.placed.reach ?? 18), r.y - (v.placed.reach ?? 18), r.width + 2 * (v.placed.reach ?? 18), r.height + 2 * (v.placed.reach ?? 18));
    }
    for (const d of this.room.doors) g.lineStyle(1, 0x6ff3ff, 1).strokeRect(...d.rect);
    g.lineStyle(1, 0xffffff, 1).strokeRect(this.player.x - 5, this.player.y - 6, 10, 6);
  }

  /** Debug info for the overlay. */
  debugInfo() {
    const h = this.hovered ?? this.focused;
    return h ? { id: h.placed.id, texture: h.key, url: assetById(h.key)?.url ?? '(procedural)' } : null;
  }
}
