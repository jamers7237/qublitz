/**
 * Typed semantic asset manifest.
 *
 * Every visual/audio thing in the game has a stable ID. Gameplay code only ever
 * refers to IDs. To replace art, drop a transparent PNG at `url` (under /public),
 * or point `url` at a different file. If the file is absent or fails to load,
 * an original procedural sprite of the same size is drawn instead.
 *
 * anchor: draw origin (0..1). Floor furniture uses bottom-centre (0.5, 1) so
 * taller replacement art grows upward without moving its collision footprint.
 */
export type AssetKind = 'image' | 'spritesheet' | 'portrait' | 'audio';

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  url?: string;
  width: number;
  height: number;
  frameWidth?: number;
  frameHeight?: number;
  /** spritesheet frame order documentation */
  frames?: string;
  anchor?: { x: number; y: number };
  description: string;
  category: 'player' | 'tile' | 'sensor' | 'gadget' | 'object' | 'door' | 'item' | 'fx' | 'portrait' | 'audio' | 'decor';
}

const A: AssetEntry[] = [];
const add = (e: AssetEntry) => A.push(e);
const img = (id: string, url: string, w: number, h: number, category: AssetEntry['category'], description: string, anchor = { x: 0.5, y: 1 }) =>
  add({ id, kind: 'image', url, width: w, height: h, category, description, anchor });

// Player
add({
  id: 'player', kind: 'spritesheet', url: 'assets/sprites/player.png', width: 64, height: 96, frameWidth: 16, frameHeight: 24,
  frames: 'Rows: 0=walk down, 1=walk left, 2=walk right, 3=walk up. Columns 0..3 = walk cycle (0 and 2 are standing poses).',
  anchor: { x: 0.5, y: 1 }, category: 'player', description: 'Player character, 4 directions x 4 walking frames.',
});

// Tiles (16x16)
for (const [id, file, d] of [
  ['tile.floor.wood', 'floor_wood', 'Common room wooden floorboards'],
  ['tile.floor.left', 'floor_left_carpet', 'Left bedroom carpet (dusty purple)'],
  ['tile.floor.right', 'floor_right_carpet', 'Right bedroom carpet (teal)'],
  ['tile.floor.hall', 'floor_hall', 'Foyer / hallway tiles'],
  ['tile.floor.vault', 'floor_vault', 'Vault room stone'],
  ['tile.rug', 'rug', 'Rug tile (gold-trimmed)'],
  ['tile.wall', 'wall_face', 'Wall face (wallpaper)'],
  ['tile.wall.cap', 'wall_cap', 'Top edge of a wall'],
  ['tile.wall.side', 'wall_side', 'Side / bottom wall block'],
] as const) img(id, `assets/sprites/tiles/${file}.png`, 16, 16, 'tile', d, { x: 0, y: 0 });

// Sensors: one texture per physical state (+ optional unresolved shimmer used in ECHO timelines)
const sensor = (base: string, file: string, w: number, h: number, states: [string, string], name: string) => {
  for (const st of [...states, 'unresolved']) img(`obj.${base}.${st}`, `assets/sprites/objects/${file}_${st}.png`, w, h, 'sensor', `${name}: ${st}${st === 'unresolved' ? ' (optional; auto-composited from both states if absent)' : ''}`);
};
sensor('window', 'window', 32, 28, ['closed', 'open'], 'Common-room window (CAT)');
sensor('closet', 'left_closet', 32, 44, ['latched', 'ajar'], 'Left closet (I1)');
sensor('trash', 'trash', 16, 20, ['empty', 'full'], 'Trash bin (I0)');
sensor('couch', 'couch', 48, 28, ['clean', 'stained'], 'Couch (P2)');
sensor('clock', 'clock', 16, 16, ['stopped', 'ticking'], 'Wall clock (P1)');
sensor('lamp', 'desk_lamp', 16, 28, ['dark', 'lit'], 'Desk lamp (P0)');
sensor('sink', 'sink', 32, 28, ['dry', 'dripping'], 'Sink faucet (T1)');
sensor('radiator', 'radiator', 32, 20, ['cold', 'warm'], 'Radiator (T0)');

// Gadgets
const gad = (id: string, file: string, w: number, h: number, d: string) => img(id, `assets/sprites/gadgets/${file}.png`, w, h, 'gadget', d);
gad('obj.gramophone', 'gramophone', 32, 40, 'Gramophone on its stand');
gad('obj.gramophone.harmonics', 'gramophone_harmonics', 32, 40, "Gramophone with Hadamard's Harmonics installed");
gad('obj.lever', 'brass_lever', 8, 20, 'Brass address lever');
gad('obj.hatch.closed', 'hatch_closed', 16, 8, 'Brass panel under the record player (closed)');
gad('obj.hatch.open', 'hadamards_harmonics', 16, 8, "Open panel revealing Hadamard's Harmonics");
gad('obj.sleeves', 'record_sleeves', 20, 24, 'Record sleeve rack (Prime Ledger)');
gad('obj.cabinet.locked', 'polarity_cabinet_locked', 32, 32, 'Polarity Cabinet (locked)');
gad('obj.cabinet.unlocked', 'polarity_cabinet', 32, 32, 'Polarity Cabinet (ready)');
gad('obj.cabinet.solved', 'polarity_cabinet_solved', 32, 32, 'Polarity Cabinet (calibrated, lamp on)');
gad('obj.listening.locked', 'listening_desk_locked', 40, 30, 'Listening Desk (locked)');
gad('obj.listening.unlocked', 'listening_desk', 40, 30, 'Listening Desk (ready)');
gad('obj.lantern.locked', 'lantern_locked', 12, 20, 'Which-Path Lantern (shuttered)');
gad('obj.lantern.unlocked', 'lantern', 12, 20, 'Which-Path Lantern (open)');
gad('obj.switchboard.locked', 'switchboard_locked', 40, 32, 'Tangled Switchboard (dead)');
gad('obj.switchboard.unlocked', 'switchboard', 40, 32, 'Tangled Switchboard (live)');
gad('obj.switchboard.solved', 'switchboard_solved', 40, 32, 'Tangled Switchboard (3 lamps lit)');
gad('obj.mirror.locked', 'mirror_locked', 36, 36, 'Fractured Mirror (inactive)');
gad('obj.mirror.unlocked', 'mirror', 36, 36, 'Fractured Mirror (active)');
gad('obj.mirror.solved', 'mirror_solved', 36, 36, 'Fractured Mirror (beam aligned)');
gad('obj.toaster.locked', 'toaster_locked', 24, 28, 'Many-Worlds Toaster on shelf (locked)');
gad('obj.toaster.unlocked', 'toaster', 24, 28, 'Many-Worlds Toaster (ready)');
gad('obj.projector.broken', 'projector_broken', 20, 20, 'Slide projector (no prism)');
gad('obj.projector.fixed', 'projector_fixed', 20, 20, 'Slide projector (beam on)');
gad('obj.metronome.broken', 'metronome_broken', 12, 20, 'Metronome (no key)');
gad('obj.metronome.fixed', 'metronome_fixed', 12, 20, 'Metronome (ticking)');
gad('obj.vault.locked', 'vault_locked', 64, 60, 'Vault door (sealed)');
gad('obj.vault.ready', 'vault_ready', 64, 60, 'Vault door (sixteen grooves glowing)');

// Objects / furniture
const obj = (id: string, file: string, w: number, h: number, d: string) => img(id, `assets/sprites/objects/${file}.png`, w, h, 'object', d);
obj('obj.bed.left', 'bed_left', 32, 48, 'Your bed');
obj('obj.bed.right', 'bed_right', 32, 48, 'J’s bed');
obj('obj.desk', 'desk', 48, 28, 'Left desk');
obj('obj.notebook', 'notebook', 12, 8, 'Notebook under the desk');
obj('obj.jnote', 'j_note', 10, 8, 'Folded note from J');
obj('obj.bookshelf', 'bookshelf', 32, 44, 'Bookshelf');
obj('obj.bedsidebox', 'bedside_box', 14, 12, 'Bedside box');
obj('obj.photo.small', 'photo_frame_left', 16, 14, 'Small framed photo (left)');
obj('obj.clipping', 'clipping', 12, 14, 'Scorched clipping pinned to wall');
obj('obj.portrait', 'portrait_frame', 20, 24, 'Portrait frame (right) — opens james.jpg');
obj('obj.poster', 'poster', 24, 32, 'Concert poster');
obj('obj.stickynote', 'sticky_note', 8, 8, 'Sticky note');
obj('obj.dresser', 'dresser', 32, 30, 'Dresser');
obj('obj.coatrack', 'coat_rack', 16, 32, 'Coat rack');
obj('obj.mailbox', 'mail_slot', 16, 16, 'Mail slot');
obj('obj.plaque', 'plaque', 24, 12, 'Brass plaque by the vault');

// Doors
const door = (id: string, file: string, w: number, h: number, d: string, anchor = { x: 0.5, y: 1 }) => img(id, `assets/sprites/objects/${file}.png`, w, h, 'door', d, anchor);
door('obj.door.top', 'door_top', 32, 48, 'Doorway in a top wall');
door('obj.door.vault', 'door_vault_room', 32, 48, 'Doorway to the vault room');
door('obj.door.bottom', 'door_bottom', 32, 16, 'Doorway in a bottom wall');
door('obj.door.side', 'door_side', 16, 32, 'Doorway in a side wall');
door('obj.door.front', 'front_door', 32, 16, 'Foyer front door (rewind)');

// Decor (never interactive, never highlighted)
const deco = (id: string, file: string, w: number, h: number, d: string) => img(id, `assets/sprites/objects/${file}.png`, w, h, 'decor', d);
deco('deco.plant', 'plant', 16, 24, 'Potted plant');
deco('deco.boxes', 'boxes', 24, 20, 'Moving boxes');
deco('deco.shoes', 'shoes', 16, 8, 'Shoes by the door');
deco('deco.stool', 'stool', 12, 12, 'Stool');
deco('deco.shelf', 'wall_shelf', 24, 10, 'Wall shelf');
deco('deco.table', 'coffee_table', 32, 16, 'Coffee table');
deco('deco.fridge', 'fridge', 20, 36, 'Fridge');
deco('deco.armchair', 'armchair', 24, 24, 'Armchair');

// Items (16x16 icons, also used for world pickups)
const item = (id: string, file: string, d: string) => img(id, `assets/sprites/items/${file}.png`, 16, 16, 'item', d);
item('item.prism', 'prism', 'Small glass prism');
item('item.cassette', 'cassette', 'Red cassette tape');
item('item.key', 'metronome_key', 'Brass wind-up key');
item('item.notebook', 'notebook_icon', 'Survivor’s Notebook (key item)');
item('item.cartridge', 'hadamards_harmonics_icon', "Hadamard's Harmonics (key item)");

// FX
img('fx.note', 'assets/sprites/fx/note.png', 8, 10, 'fx', 'Floating music note when a shot plays');
img('fx.ghost', 'assets/sprites/fx/ghost.png', 10, 10, 'fx', 'Ghost echo wisp');
img('fx.prompt', 'assets/sprites/fx/prompt.png', 9, 9, 'fx', '"E" prompt bubble');

// Portraits (React UI, dialogue)
add({ id: 'portrait.james', kind: 'portrait', url: 'assets/portraits/james.png', width: 64, height: 64, category: 'portrait', description: 'J / James dialogue portrait' });
add({ id: 'portrait.player', kind: 'portrait', url: 'assets/portraits/player.png', width: 64, height: 64, category: 'portrait', description: 'Player dialogue portrait (optional)' });

// Audio (optional overrides; synthesized fallback)
add({ id: 'audio.ambient', kind: 'audio', url: 'assets/audio/ambient.mp3', width: 0, height: 0, category: 'audio', description: 'Ambient loop (replaces the synthesized drone)' });

export const MANIFEST: readonly AssetEntry[] = A;
export const assetById = (id: string) => MANIFEST.find((a) => a.id === id);
