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
    id: 'common', name: 'D107 · Common room', floor: 'tile.floor.wood', floorRect: [2, 3, 28, 14], darkness: 0.42,
    rugs: [],
    gaps: [['top', 424, 456], ['bottom', 240, 272], ['left', 144, 176], ['right', 144, 176]],
    objects: [
      { id: 'dorm.desk.4', asset: 'dorm.desk', x: 432, y: 112, layer: 'y', solid: [64, 18], decor: true },
      { id: 'dorm.couch.2', asset: 'dorm.couch', x: 284, y: 84, layer: 'y', solid: [48, 14], decor: true },
      { id: 'dorm.couch.3', asset: 'dorm.couch.faceRight', x: 198, y: 146, layer: 'y', solid: [24, 40], decor: true },
      { id: 'dorm.led', asset: 'dorm.led', x: 256, y: 23, layer: 'wall', decor: true },
      { id: 'dorm.collage', asset: 'dorm.collage', x: 112, y: 44, layer: 'wall', decor: true },
      { id: 'dorm.whiteboard', asset: 'dorm.whiteboard', x: 360, y: 44, layer: 'wall', decor: true },
      { id: 'dorm.dino', asset: 'dorm.dino', x: 370, y: 198, layer: 'y', decor: true, depthBias: 70 },
      { id: 'dorm.desk.1', asset: 'dorm.desk', x: 80, y: 112, layer: 'y', solid: [64, 18], decor: true },
      { id: 'dorm.desk.2', asset: 'dorm.desk', x: 80, y: 260, layer: 'y', solid: [64, 18], decor: true },
      { id: 'dorm.desk.3', asset: 'dorm.desk', x: 432, y: 260, layer: 'y', solid: [64, 18], decor: true },
      { id: 'door.common.north', x: 440, y: 48, layer: 'wall', hit: [32, 44], reach: 26 },
      { id: 'door.common.south', x: 256, y: 288, layer: 'wall', hit: [32, 16], reach: 22 },
      { id: 'door.common.west', x: 24, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'door.common.east', x: 488, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'window', x: 256, y: 48, layer: 'wall', hit: [120, 38], reach: 34 },
      { id: 'clock', x: 176, y: 40, layer: 'wall', hit: [18, 18], reach: 34 },
      { id: 'radiator', x: 336, y: 70, layer: 'y', solid: [32, 10], hit: [32, 20] },
      { id: 'sink', x: 350, y: 254, layer: 'y', hit: [32, 24], reach: 24 },
      { id: 'trash', x: 412, y: 152, layer: 'y', solid: [12, 8], hit: [16, 20] },
      { id: 'deco.fridge', asset: 'deco.fridge', x: 370, y: 110, layer: 'y', solid: [20, 12], decor: true },
      { id: 'gramophone', x: 256, y: 196, layer: 'y', solid: [28, 14], hit: [30, 30], hitOffsetY: -10 },
      { id: 'hatch', x: 256, y: 192, layer: 'y', hit: [18, 10], depthBias: 2, reach: 26 },
      { id: 'lever', x: 286, y: 196, layer: 'y', solid: [6, 6], hit: [10, 20] },
      { id: 'sleeves', x: 222, y: 196, layer: 'y', solid: [18, 8], hit: [20, 24] },
      { id: 'couch', x: 228, y: 84, layer: 'y', solid: [48, 14], hit: [48, 28] },
      { id: 'lamp', x: 166, y: 206, layer: 'y', solid: [14, 8], hit: [16, 28] },
      { id: 'deco.table', asset: 'dorm.ottoman', x: 256, y: 132, layer: 'y', solid: [32, 8], decor: true },
      { id: 'deco.armchair', asset: 'dorm.recliner.faceLeft', x: 314, y: 134, layer: 'y', solid: [28, 18], decor: true },
      { id: 'deco.plant', asset: 'deco.plant', x: 138, y: 108, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [
      { id: 'door.common.north', rect: [424, 24, 32, 18] },
      { id: 'door.common.south', rect: [240, 276, 32, 14] },
      { id: 'door.common.west', rect: [16, 144, 12, 32] },
      { id: 'door.common.east', rect: [480, 144, 12, 32] },
    ],
    spawns: { fromFoyer: [256, 264], fromLeft: [48, 170], fromRight: [464, 170], fromVault: [472, 72], center: [256, 218] },
  },
  left: {
    id: 'left', name: 'D107 · Left bedroom', floor: 'tile.floor.wood', floorRect: [5, 4, 22, 11], darkness: 0.48,
    rugs: [],
    gaps: [['right', 144, 176]],
    objects: [
      { id: 'dorm.secondBed', asset: 'dorm.bed.blue', x: 258, y: 110, layer: 'y', solid: [56, 32], decor: true },
      { id: 'dorm.wardrobe', asset: 'dorm.wardrobe', x: 390, y: 232, layer: 'y', solid: [42, 18], decor: true },
      { id: 'dorm.blinds', asset: 'dorm.blinds', x: 256, y: 59, layer: 'wall', decor: true },
      { id: 'dorm.sconce.1', asset: 'dorm.sconce', x: 84, y: 55, layer: 'wall', decor: true },
      { id: 'dorm.sconce.2', asset: 'dorm.sconce', x: 422, y: 55, layer: 'wall', decor: true },
      { id: 'dorm.rack', asset: 'dorm.rack', x: 334, y: 232, layer: 'y', decor: true },
      { id: 'dorm.storage', asset: 'deco.boxes', x: 390, y: 172, layer: 'y', decor: true, depthBias: 60 },
      { id: 'door.left.east', x: 440, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'closet', x: 100, y: 104, layer: 'y', solid: [32, 16], hit: [32, 44] },
      { id: 'bookshelf', x: 140, y: 104, layer: 'y', solid: [32, 14], hit: [32, 44] },
      { id: 'pickup.prism', x: 148, y: 86, layer: 'y', hit: [16, 16], depthBias: 30, reach: 30 },
      { id: 'desk', x: 190, y: 102, layer: 'y', solid: [48, 12], hit: [48, 28] },
      { id: 'notebook', x: 182, y: 114, layer: 'y', hit: [16, 12], reach: 24 },
      { id: 'jnote', x: 202, y: 82, layer: 'y', hit: [14, 12], depthBias: 30, reach: 30 },
      { id: 'photo.left', x: 164, y: 50, layer: 'wall', hit: [18, 16], reach: 40 },
      { id: 'clipping', x: 190, y: 52, layer: 'wall', hit: [14, 16], reach: 40 },
      { id: 'cabinet', x: 316, y: 106, layer: 'y', solid: [30, 12], hit: [32, 32] },
      { id: 'lantern', x: 348, y: 106, layer: 'y', solid: [10, 6], hit: [14, 20] },
      { id: 'listening', x: 390, y: 108, layer: 'y', solid: [40, 12], hit: [40, 30] },
      { id: 'bed.left', x: 258, y: 232, layer: 'y', solid: [56, 32], hit: [60, 40] },
      { id: 'bedsideBox', x: 204, y: 222, layer: 'y', solid: [14, 8], hit: [14, 12] },
      { id: 'pickup.key', x: 204, y: 212, layer: 'y', hit: [16, 14], depthBias: 20, reach: 28 },
      { id: 'deco.plant', asset: 'deco.plant', x: 420, y: 232, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [{ id: 'door.left.east', rect: [432, 144, 12, 32] }],
    spawns: { fromCommon: [418, 170], center: [256, 178] },
  },
  right: {
    id: 'right', name: 'D107 · Right bedroom', floor: 'tile.floor.wood', floorRect: [5, 4, 22, 11], darkness: 0.48,
    rugs: [],
    gaps: [['left', 144, 176]],
    objects: [
      { id: 'dorm.secondBed', asset: 'dorm.bed.sage.horizontal', x: 258, y: 110, layer: 'y', solid: [56, 32], decor: true },
      { id: 'dorm.wardrobe', asset: 'dorm.wardrobe', x: 110, y: 232, layer: 'y', solid: [42, 18], decor: true },
      { id: 'dorm.blinds', asset: 'dorm.blinds', x: 256, y: 59, layer: 'wall', decor: true },
      { id: 'dorm.sconce.1', asset: 'dorm.sconce', x: 84, y: 55, layer: 'wall', decor: true },
      { id: 'dorm.sconce.2', asset: 'dorm.sconce', x: 422, y: 55, layer: 'wall', decor: true },
      { id: 'dorm.rack', asset: 'dorm.rack', x: 190, y: 230, layer: 'y', decor: true },
      { id: 'dorm.storage', asset: 'deco.boxes', x: 110, y: 172, layer: 'y', decor: true, depthBias: 60 },
      { id: 'door.right.west', x: 72, y: 176, layer: 'wall', hit: [16, 32], reach: 20 },
      { id: 'metronome', x: 96, y: 108, layer: 'y', solid: [10, 6], hit: [14, 20] },
      { id: 'mirror', x: 156, y: 118, layer: 'y', solid: [34, 12], hit: [36, 36] },
      { id: 'sticky', x: 164, y: 46, layer: 'wall', hit: [12, 12], reach: 44 },
      { id: 'switchboard', x: 194, y: 60, layer: 'wall', hit: [40, 32], reach: 30 },
      { id: 'portrait', x: 308, y: 56, layer: 'wall', hit: [22, 26], reach: 36 },
      { id: 'poster', x: 332, y: 58, layer: 'wall', hit: [26, 32], reach: 32 },
      { id: 'projector', x: 292, y: 160, layer: 'y', solid: [18, 8], hit: [20, 20] },
      { id: 'dresser', x: 374, y: 104, layer: 'y', solid: [32, 12], hit: [32, 30] },
      { id: 'pickup.cassette', x: 374, y: 82, layer: 'y', hit: [16, 16], depthBias: 30, reach: 30 },
      { id: 'toaster', x: 416, y: 106, layer: 'y', solid: [24, 8], hit: [24, 28] },
      { id: 'bed.right', x: 408, y: 232, layer: 'y', solid: [40, 54], hit: [40, 60] },
      { id: 'deco.plant', asset: 'deco.plant', x: 228, y: 232, layer: 'y', solid: [10, 6], decor: true },
    ],
    doors: [{ id: 'door.right.west', rect: [64, 144, 12, 32] }],
    spawns: { fromCommon: [94, 170], center: [256, 178] },
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
