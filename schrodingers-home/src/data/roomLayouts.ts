import type { RoomId } from '../state/types';

/**
 * Data-driven room layouts. 512x288 logical px = 32x18 tiles of 16px.
 *
 * Every placed object has:
 *  - id:     interactable id (see data/interactables.ts) or a decor id
 *  - x, y:   ANCHOR point in px. Floor furniture anchors at bottom-centre ("feet").
 *  - layer:  'y' = depth-sorted with the player, 'wall' = mounted on the wall
 *  - solid:  collision footprint [w, h] centred on x, extending UP from y (omit = walk-through)
 *  - hit:    clickable/inspectable hitbox [w, h], independent of the art size so
 *            replacement sprites never move invisible triggers
 *  - reach:  keyboard interaction distance in px measured from the hitbox edge
 */
export interface PlacedObject {
  id: string;
  asset?: string; // decor only
  x: number;
  y: number;
  layer: 'y' | 'wall';
  solid?: [number, number];
  hit?: [number, number];
  hitOffsetY?: number;
  reach?: number;
  depthBias?: number;
  decor?: boolean;
}

export interface DoorTrigger {
  id: string;
  rect: [number, number, number, number];
}

export interface RoomLayout {
  id: RoomId;
  name: string;
  floor: string;
  /** walkable floor rectangle in TILES: [x, y, w, h] */
  floorRect: [number, number, number, number];
  rugs: [number, number, number, number][];
  /** wall openings in px along the wall: [side, from, to] */
  gaps: ['top' | 'bottom' | 'left' | 'right', number, number][];
  objects: PlacedObject[];
  doors: DoorTrigger[];
  spawns: Record<string, [number, number]>;
  /** lighting: overall darkness 0..1 */
  darkness: number;
}

const S = 16;

export const ROOMS: Record<RoomId, RoomLayout> = {
  foyer: {
    id: 'foyer', name: 'Hallway', floor: 'tile.floor.hall', floorRect: [10, 3, 12, 14], darkness: 0.5,
    rugs: [[14, 8, 4, 6]],
    gaps: [['top', 240, 272]],
    objects: [
      { id: 'door.foyer.north', x: 256, y: 48, layer: 'wall', hit: [32, 44], reach: 26 },
      { id: 'frontdoor', x: 256, y: 288, layer: 'wall', hit: [36, 18], reach: 22 },
      { id: 'coatrack', x: 186, y: 122, layer: 'y', solid: [8, 6], hit: [16, 32] },
      { id: 'mailbox', x: 316, y: 40, layer: 'wall', hit: [16, 16], reach: 24 },
      { id: 'deco.shoes', asset: 'deco.shoes', x: 300, y: 262, layer: 'y', decor: true },
      { id: 'deco.plant', asset: 'deco.plant', x: 334, y: 84, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [{ id: 'door.foyer.north', rect: [240, 24, 32, 18] }],
    spawns: { start: [256, 236], rewind: [256, 236], fromCommon: [256, 72], center: [256, 180] },
  },
  common: {
    id: 'common', name: 'D107 · Common room', floor: 'tile.floor.wood', floorRect: [1, 3, 30, 14], darkness: 0.42,
    rugs: [],
    gaps: [['top', 432, 464], ['bottom', 240, 272], ['left', 144, 176], ['right', 144, 176]],
    objects: [
      { id: 'dorm.led', asset: 'dorm.led', x: 256, y: 7, layer: 'wall', decor: true },
      { id: 'dorm.collage', asset: 'dorm.collage', x: 85, y: 40, layer: 'wall', decor: true },
      { id: 'dorm.whiteboard', asset: 'dorm.whiteboard', x: 370, y: 42, layer: 'wall', decor: true },
      { id: 'dorm.dino', asset: 'dorm.dino', x: 390, y: 174, layer: 'y', decor: true, depthBias: 70 },
      { id: 'dorm.desk.1', asset: 'dorm.desk', x: 70, y: 98, layer: 'y', solid: [64, 12], decor: true },
      { id: 'dorm.desk.2', asset: 'dorm.desk', x: 70, y: 252, layer: 'y', solid: [64, 12], decor: true },
      { id: 'dorm.desk.3', asset: 'dorm.desk', x: 430, y: 252, layer: 'y', solid: [64, 12], decor: true },
      { id: 'dorm.chair.1', asset: 'dorm.chair', x: 72, y: 132, layer: 'y', solid: [20, 8], decor: true },
      { id: 'dorm.chair.2', asset: 'dorm.chair', x: 72, y: 222, layer: 'y', solid: [20, 8], decor: true },
      { id: 'dorm.chair.3', asset: 'dorm.chair', x: 430, y: 222, layer: 'y', solid: [20, 8], decor: true },
      { id: 'door.common.north', x: 448, y: 48, layer: 'wall', hit: [32, 44], reach: 26 },
      { id: 'door.common.south', x: 256, y: 288, layer: 'wall', hit: [32, 16], reach: 22 },
      { id: 'door.common.west', x: 8, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'door.common.east', x: 504, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'window', x: 256, y: 48, layer: 'wall', hit: [120, 38], reach: 34 },
      { id: 'clock', x: 184, y: 36, layer: 'wall', hit: [18, 18], reach: 34 },
      { id: 'deco.shelf', asset: 'deco.shelf', x: 400, y: 30, layer: 'wall', decor: true },
      { id: 'radiator', x: 256, y: 70, layer: 'y', solid: [32, 10], hit: [32, 20] },
      { id: 'sink', x: 440, y: 78, layer: 'y', solid: [32, 14], hit: [32, 28] },
      { id: 'trash', x: 446, y: 116, layer: 'y', solid: [12, 8], hit: [16, 20] },
      { id: 'deco.fridge', asset: 'deco.fridge', x: 342, y: 100, layer: 'y', solid: [20, 12], decor: true },
      { id: 'gramophone', x: 256, y: 150, layer: 'y', solid: [28, 14], hit: [30, 30], hitOffsetY: -10 },
      { id: 'hatch', x: 256, y: 146, layer: 'y', hit: [18, 10], depthBias: 2, reach: 26 },
      { id: 'lever', x: 282, y: 150, layer: 'y', solid: [6, 6], hit: [10, 20] },
      { id: 'sleeves', x: 222, y: 150, layer: 'y', solid: [18, 8], hit: [20, 24] },
      { id: 'couch', x: 230, y: 108, layer: 'y', solid: [48, 14], hit: [48, 28] },
      { id: 'lamp', x: 164, y: 214, layer: 'y', solid: [14, 8], hit: [16, 28] },
      { id: 'deco.table', asset: 'dorm.ottoman', x: 282, y: 111, layer: 'y', solid: [32, 8], decor: true },
      { id: 'deco.armchair', asset: 'dorm.chair', x: 302, y: 94, layer: 'y', solid: [24, 12], decor: true },
      { id: 'deco.plant', asset: 'deco.plant', x: 36, y: 84, layer: 'y', solid: [10, 6], decor: true },
      { id: 'deco.stool', asset: 'deco.stool', x: 400, y: 238, layer: 'y', solid: [10, 6], decor: true },
      { id: 'deco.boxes', asset: 'deco.boxes', x: 452, y: 262, layer: 'y', solid: [24, 10], decor: true },
    ],
    doors: [
      { id: 'door.common.north', rect: [432, 24, 32, 18] },
      { id: 'door.common.south', rect: [240, 276, 32, 14] },
      { id: 'door.common.west', rect: [-4, 144, 12, 32] },
      { id: 'door.common.east', rect: [504, 144, 12, 32] },
    ],
    spawns: { fromFoyer: [256, 258], fromLeft: [32, 170], fromRight: [480, 170], fromVault: [480, 72], center: [256, 200] },
  },
  left: {
    id: 'left', name: 'D107 · Left bedroom', floor: 'tile.floor.wood', floorRect: [1, 3, 30, 14], darkness: 0.48,
    rugs: [],
    gaps: [['right', 144, 176]],
    objects: [
      { id: 'dorm.secondBed', asset: 'dorm.bed.blue', x: 380, y: 260, layer: 'y', solid: [40, 54], decor: true },
      { id: 'dorm.wardrobe', asset: 'dorm.wardrobe', x: 438, y: 262, layer: 'y', solid: [42, 18], decor: true },
      { id: 'dorm.blinds', asset: 'dorm.blinds', x: 256, y: 43, layer: 'wall', decor: true },
      { id: 'dorm.sconce.1', asset: 'dorm.sconce', x: 42, y: 39, layer: 'wall', decor: true },
      { id: 'dorm.sconce.2', asset: 'dorm.sconce', x: 464, y: 39, layer: 'wall', decor: true },
      { id: 'dorm.rack', asset: 'dorm.rack', x: 330, y: 260, layer: 'y', decor: true },
      { id: 'dorm.storage', asset: 'deco.boxes', x: 438, y: 213, layer: 'y', decor: true, depthBias: 60 },
      { id: 'door.left.east', x: 504, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'closet', x: 60, y: 94, layer: 'y', solid: [32, 16], hit: [32, 44] },
      { id: 'bookshelf', x: 112, y: 94, layer: 'y', solid: [32, 14], hit: [32, 44] },
      { id: 'pickup.prism', x: 120, y: 74, layer: 'y', hit: [16, 16], depthBias: 30, reach: 30 },
      { id: 'desk', x: 200, y: 92, layer: 'y', solid: [48, 12], hit: [48, 28] },
      { id: 'notebook', x: 190, y: 104, layer: 'y', hit: [16, 12], reach: 24 },
      { id: 'jnote', x: 214, y: 70, layer: 'y', hit: [14, 12], depthBias: 30, reach: 30 },
      { id: 'photo.left', x: 142, y: 34, layer: 'wall', hit: [18, 16], reach: 40 },
      { id: 'clipping', x: 174, y: 36, layer: 'wall', hit: [14, 16], reach: 40 },
      { id: 'cabinet', x: 330, y: 98, layer: 'y', solid: [30, 12], hit: [32, 32] },
      { id: 'lantern', x: 370, y: 98, layer: 'y', solid: [10, 6], hit: [14, 20] },
      { id: 'listening', x: 424, y: 100, layer: 'y', solid: [40, 12], hit: [40, 30] },
      { id: 'bed.left', x: 130, y: 256, layer: 'y', solid: [40, 54], hit: [40, 60] },
      { id: 'bedsideBox', x: 92, y: 220, layer: 'y', solid: [14, 8], hit: [14, 12] },
      { id: 'pickup.key', x: 92, y: 210, layer: 'y', hit: [16, 14], depthBias: 20, reach: 28 },
      { id: 'deco.plant', asset: 'deco.plant', x: 476, y: 262, layer: 'y', solid: [10, 6], decor: true },
      { id: 'deco.boxes', asset: 'deco.boxes', x: 300, y: 262, layer: 'y', solid: [24, 10], decor: true },
    ],
    doors: [{ id: 'door.left.east', rect: [504, 144, 12, 32] }],
    spawns: { fromCommon: [478, 170], center: [256, 180] },
  },
  right: {
    id: 'right', name: 'D107 · Right bedroom', floor: 'tile.floor.wood', floorRect: [1, 3, 30, 14], darkness: 0.48,
    rugs: [],
    gaps: [['left', 144, 176]],
    objects: [
      { id: 'dorm.secondBed', asset: 'dorm.bed.sage', x: 120, y: 260, layer: 'y', solid: [40, 54], decor: true },
      { id: 'dorm.wardrobe', asset: 'dorm.wardrobe', x: 68, y: 262, layer: 'y', solid: [42, 18], decor: true },
      { id: 'dorm.blinds', asset: 'dorm.blinds', x: 256, y: 43, layer: 'wall', decor: true },
      { id: 'dorm.sconce.1', asset: 'dorm.sconce', x: 42, y: 39, layer: 'wall', decor: true },
      { id: 'dorm.sconce.2', asset: 'dorm.sconce', x: 464, y: 39, layer: 'wall', decor: true },
      { id: 'dorm.rack', asset: 'dorm.rack', x: 174, y: 260, layer: 'y', decor: true },
      { id: 'dorm.storage', asset: 'deco.boxes', x: 68, y: 213, layer: 'y', decor: true, depthBias: 60 },
      { id: 'door.right.west', x: 8, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'metronome', x: 56, y: 100, layer: 'y', solid: [10, 6], hit: [14, 20] },
      { id: 'mirror', x: 130, y: 112, layer: 'y', solid: [34, 12], hit: [36, 36] },
      { id: 'sticky', x: 140, y: 30, layer: 'wall', hit: [12, 12], reach: 44 },
      { id: 'switchboard', x: 184, y: 44, layer: 'wall', hit: [40, 32], reach: 30 },
      { id: 'portrait', x: 320, y: 40, layer: 'wall', hit: [22, 26], reach: 36 },
      { id: 'poster', x: 352, y: 42, layer: 'wall', hit: [26, 32], reach: 32 },
      { id: 'projector', x: 300, y: 160, layer: 'y', solid: [18, 8], hit: [20, 20] },
      { id: 'dresser', x: 404, y: 94, layer: 'y', solid: [32, 12], hit: [32, 30] },
      { id: 'pickup.cassette', x: 404, y: 70, layer: 'y', hit: [16, 16], depthBias: 30, reach: 30 },
      { id: 'toaster', x: 470, y: 98, layer: 'y', solid: [24, 8], hit: [24, 28] },
      { id: 'bed.right', x: 380, y: 256, layer: 'y', solid: [40, 54], hit: [40, 60] },
      { id: 'deco.plant', asset: 'deco.plant', x: 220, y: 262, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [{ id: 'door.right.west', rect: [-4, 144, 12, 32] }],
    spawns: { fromCommon: [34, 170], center: [256, 180] },
  },
  vault: {
    id: 'vault', name: 'Vault room', floor: 'tile.floor.vault', floorRect: [8, 3, 16, 14], darkness: 0.6,
    rugs: [[13, 8, 6, 6]],
    gaps: [['bottom', 240, 272]],
    objects: [
      { id: 'door.vault.south', x: 256, y: 288, layer: 'wall', hit: [32, 16], reach: 22 },
      { id: 'vault', x: 256, y: 60, layer: 'y', solid: [64, 12], hit: [64, 56], reach: 26 },
      { id: 'plaque', x: 316, y: 38, layer: 'wall', hit: [24, 12], reach: 36 },
      { id: 'deco.plant', asset: 'deco.plant', x: 152, y: 262, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [{ id: 'door.vault.south', rect: [240, 276, 32, 14] }],
    spawns: { fromCommon: [256, 252], center: [256, 180] },
  },
};

/** Static wall collision rectangles (px) with door gaps cut out. */
export function wallRects(room: RoomLayout): [number, number, number, number][] {
  const [fx, fy, fw, fh] = room.floorRect;
  const L = (fx - 1) * S, R = (fx + fw) * S, T = fy * S, B = (fy + fh) * S;
  const out: [number, number, number, number][] = [];
  const seg = (side: 'top' | 'bottom' | 'left' | 'right', a: number, b: number, mk: (p: number, q: number) => [number, number, number, number]) => {
    const gaps = room.gaps.filter((g) => g[0] === side).sort((x, y) => x[1] - y[1]);
    let cur = a;
    for (const [, g0, g1] of gaps) {
      if (g0 > cur) out.push(mk(cur, g0));
      cur = Math.max(cur, g1);
    }
    if (cur < b) out.push(mk(cur, b));
  };
  seg('top', L, R + S, (p, q) => [p, 0, q - p, T]);
  seg('bottom', L, R + S, (p, q) => [p, B, q - p, 288 - B + 16]);
  seg('left', T, B, (p, q) => [L - 32, p, S + 32, q - p]);
  seg('right', T, B, (p, q) => [R, p, S + 32, q - p]);
  return out;
}

export const roomOf = (id: RoomId) => ROOMS[id];
