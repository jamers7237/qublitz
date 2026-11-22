export type RoomId = 'foyer' | 'common' | 'left' | 'right' | 'vault';
export type Basis = 'normal' | 'echo';
export type ItemId = 'prism' | 'cassette' | 'metronomeKey';
export type KeyItemId = 'notebook' | 'cartridge';
export type PageId = 'loops' | 'manual' | 'routes' | 'sounds' | 'parity' | 'ledger' | 'echo' | 'score';
export type PuzzleId =
  | 'prologue'
  | 'notebook'
  | 'routes'
  | 'calibration'
  | 'manual'
  | 'listening'
  | 'switchboard'
  | 'mirror'
  | 'cartridge'
  | 'echo'
  | 'ledger'
  | 'toaster'
  | 'vault'
  | 'roommate'
  | 'lantern';
export type PropertyLabel = '' | 'voice' | 'height' | 'breath';

export interface ShotRecord {
  id: number;
  timeline: number;
  outcome: number; // 8-bit basis index
  source: 'timeline' | 'toaster' | 'archive';
  lantern?: { address: number; bit: 0 | 1 };
  at: number;
}

export interface EchoRecord {
  id: number;
  timeline: number;
  bit: 0 | 1;
  source: 'timeline' | 'archive';
  at: number;
}

export interface ObservationRecord {
  timeline: number;
  objectId: string;
  state: string; // physical description key ("open", "ajar"...) — never a bit label
  via: 'inspect' | 'lever';
}

export interface ManualRow {
  route: string;
  object: string; // sensor id or ''
  zero: string; // state key the player believes means 0, or ''
  notes: string;
}

export interface TimelineState {
  index: number;
  status: 'pending' | 'active';
  mode: Basis | null;
  outcome: number | null;
  echo: 0 | 1 | null;
  lantern: { address: number; bit: 0 | 1 } | null;
  revealed: number[]; // addresses focused by the lever this timeline
}

export interface GameState {
  version: 1;
  playerName: string;
  seed: number;
  phase: 0 | 1; // hidden secret; never shown outside debug
  demo: null | 'prologue' | 'midpoint' | 'late' | 'vault';
  room: RoomId;
  spawn: string;
  timeline: TimelineState;
  nextMode: Basis;
  lanternAddress: number | null;
  route: string;
  flags: Record<string, boolean>;
  counters: { rewinds: number; vaultAttempts: number; toasterActivations: number; leverPulls: number; nextShotId: number };
  journal: {
    shots: ShotRecord[];
    echoes: EchoRecord[];
    observations: ObservationRecord[];
    routes: Record<number, { objectId: string; timeline: number }>;
    tapes: number[]; // archival reference recordings from the cassette (not measurements)
  };
  manual: ManualRow[];
  notebook: { pages: PageId[]; unread: PageId[]; scoreNotes: string; chordDraft: '' | 'major' | 'minor' };
  puzzles: {
    notebookMatch: { solved: boolean; tries: number };
    calibration: { slot: '' | 'X' | 'H'; measuredEmpty: boolean; lastResult: 0 | 1 | null; runs: number; solved: boolean };
    listening: { labels: Record<number, PropertyLabel>; solved: boolean; comparisons: number; flips: number };
    switchboard: { solved: string[]; attempts: number };
    mirror: { rot: [number, number, number]; solved: boolean };
    ledger: { found: boolean; clues: string[]; assign: Record<number, number | null>; solved: boolean };
    toaster: { step: 0 | 1 | 2; unlocked: boolean };
    vault: { order: number[]; chord: '' | 'major' | 'minor'; opened: boolean };
  };
  inventory: { items: ItemId[]; picked: ItemId[]; delivered: ItemId[]; keyItems: KeyItemId[] };
  hints: Partial<Record<PuzzleId, number>>;
  achievements: string[];
  startedAt: number;
  playMs: number;
  completedAt: number | null;
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  notes: number;
  muted: boolean;
  reducedMotion: boolean;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  showTouchControls: 'auto' | 'on' | 'off';
}

export interface DialogueLine {
  /** assigned by say(); stable identity across store clones */
  id?: number;
  speaker?: string;
  text: string;
  color?: string;
  portrait?: string;
  /** Optional choices; ids are dispatched to handleChoice() in game/interactions.ts */
  choices?: { label: string; id: string }[];
  /** Action id dispatched when this line is dismissed (e.g. 'open:calibration'). */
  then?: string;
}

export type Panel =
  | null
  | 'notebook'
  | 'inventory'
  | 'hints'
  | 'settings'
  | 'help'
  | { kind: 'minigame'; id: MinigameId }
  | { kind: 'photo'; id: string };

export type MinigameId =
  | 'notebookMatch'
  | 'calibration'
  | 'listening'
  | 'switchboard'
  | 'mirror'
  | 'cartridge'
  | 'gramophone'
  | 'ledger'
  | 'toaster'
  | 'lantern'
  | 'vault';

export interface UIState {
  screen: 'title' | 'name' | 'game' | 'ending' | 'credits';
  dialogue: DialogueLine[];
  panel: Panel;
  notebookPage: PageId;
  heldItem: ItemId | null;
  prompt: { label: string; verb: string; locked: boolean; via: 'key' | 'mouse' } | null;
  toast: { text: string; id: number } | null;
  effect: null | { kind: 'rewind' | 'static' | 'vaultOpen' | 'echo'; id: number };
  lastClosedAt: number;
  debug: boolean;
  debugHitboxes: boolean;
  hovered: string | null;
  recentActions: string[];
}
