import type { RoomId } from '../state/types';

export interface SensorState {
  key: string; // short physical description used in notebook dropdowns
  desc: string; // inspection text (no bit meaning!)
  colorBlind: string; // extra non-colour cue
}

export interface SensorDef {
  id: string;
  address: number; // 1..8 (binary route address)
  name: string;
  room: RoomId;
  zero: SensorState; // physical condition when the qubit reads 0
  one: SensorState; // physical condition when the qubit reads 1
  unresolved: string;
  assetBase: string; // manifest id prefix, e.g. 'obj.window'
}

/** Developer truth table. Player-facing UI must never print zero/one directly before discovery. */
export const SENSORS: SensorDef[] = [
  {
    id: 'window', address: 1, name: 'Common-room window', room: 'common', assetBase: 'obj.window',
    zero: { key: 'closed', desc: 'The window is shut tight. The glass is still.', colorBlind: 'sash down' },
    one: { key: 'open', desc: 'The window is open. Cold air touches your cheek, and somewhere outside, something small breathes.', colorBlind: 'sash raised, curtain moving' },
    unresolved: 'The window is open. It is always open. Even now, it refuses to blur.',
  },
  {
    id: 'closet', address: 2, name: 'Left closet', room: 'left', assetBase: 'obj.closet',
    zero: { key: 'latched', desc: 'The closet door is latched. The brass catch sits snug in its keeper.', colorBlind: 'door flush, catch down' },
    one: { key: 'ajar', desc: 'The closet door hangs ajar. A sliver of darkness and the smell of cedar.', colorBlind: 'door angled open' },
    unresolved: 'The closet door seems both shut and not. Your eyes slide off the hinge.',
  },
  {
    id: 'trash', address: 3, name: 'Common trash bin', room: 'common', assetBase: 'obj.trash',
    zero: { key: 'empty', desc: 'The trash bin is empty. Someone actually took it out.', colorBlind: 'bin hollow, lid flat' },
    one: { key: 'full', desc: 'The trash bin is full to the brim with takeout boxes and crumpled sheet music.', colorBlind: 'lid propped up by paper' },
    unresolved: 'The bin flickers between overflowing and hollow, like a rumour of garbage.',
  },
  {
    id: 'couch', address: 4, name: 'Couch', room: 'common', assetBase: 'obj.couch',
    zero: { key: 'clean', desc: 'The couch is clean. Suspiciously clean.', colorBlind: 'cushions plain' },
    one: { key: 'stained', desc: 'There is a stain on the couch cushion shaped vaguely like Ohio.', colorBlind: 'dark blotch on middle cushion' },
    unresolved: 'The cushion is stained and spotless at once. Ohio comes and goes.',
  },
  {
    id: 'clock', address: 5, name: 'Wall clock', room: 'common', assetBase: 'obj.clock',
    zero: { key: 'stopped', desc: 'The wall clock is silent. Its hands have stopped.', colorBlind: 'no ticking sound, hands frozen' },
    one: { key: 'ticking', desc: 'The wall clock is ticking. Tick. Tick. Tick.', colorBlind: 'audible ticking, second hand moves' },
    unresolved: 'The clock ticks without moving. Or moves without ticking. It is hard to say.',
  },
  {
    id: 'lamp', address: 6, name: 'Desk lamp', room: 'common', assetBase: 'obj.lamp',
    zero: { key: 'dark', desc: 'The desk lamp is dark. The bulb is cold.', colorBlind: 'no glow around shade' },
    one: { key: 'lit', desc: 'The desk lamp is lit, pooling warm gold on the side table.', colorBlind: 'yellow glow circle beneath shade' },
    unresolved: 'The lamp glows in a colour that does not quite exist.',
  },
  {
    id: 'sink', address: 7, name: 'Sink faucet', room: 'common', assetBase: 'obj.sink',
    zero: { key: 'dry', desc: 'The faucet is dry. Not a single drop.', colorBlind: 'basin empty' },
    one: { key: 'dripping', desc: 'The faucet is dripping. Plip. Plip.', colorBlind: 'drop falling, puddle in basin' },
    unresolved: 'A droplet hangs at the faucet, undecided about gravity.',
  },
  {
    id: 'radiator', address: 8, name: 'Radiator', room: 'common', assetBase: 'obj.radiator',
    zero: { key: 'cold', desc: 'The radiator is cold to the touch.', colorBlind: 'no heat shimmer' },
    one: { key: 'warm', desc: 'The radiator is warm. It knocks softly, like it is thinking.', colorBlind: 'heat shimmer lines above' },
    unresolved: 'The radiator is lukewarm in a way that feels philosophical.',
  },
];

export const sensorById = (id: string) => SENSORS.find((s) => s.id === id);
export const sensorByAddress = (a: number) => SENSORS.find((s) => s.address === a);
export const sensorStateKey = (s: SensorDef, bit: 0 | 1) => (bit ? s.one.key : s.zero.key);

/** Glyphs used in the House Manual instead of qubit names. */
export const ROW_GLYPHS = ['☉', '☽', '✶', '♒', '♄', '☄', '⚉', '♨'];
