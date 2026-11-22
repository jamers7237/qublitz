import { C } from './palette';
import { DORM, dormBed, bayWindow } from './dorm';

/**
 * Original procedural stand-in sprites. Each drawer paints onto a canvas of the
 * manifest's size. These are placeholders a teammate can replace with PNGs.
 */
type G = CanvasRenderingContext2D;
export type Drawer = (g: G, w: number, h: number) => void;

const r = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
const box = (g: G, x: number, y: number, w: number, h: number, fill: string, line = C.ink) => {
  r(g, x, y, w, h, line);
  r(g, x + 1, y + 1, w - 2, h - 2, fill);
};
const px = (g: G, x: number, y: number, c: string) => r(g, x, y, 1, 1, c);
const hl = (g: G, x: number, y: number, w: number, c: string) => r(g, x, y, w, 1, c);
const vl = (g: G, x: number, y: number, h: number, c: string) => r(g, x, y, 1, h, c);
const shadow = (g: G, x: number, y: number, w: number) => {
  g.fillStyle = 'rgba(5,4,15,0.45)';
  g.fillRect(x + 1, y, w - 2, 2);
};

// ---------------------------------------------------------------- player
function drawPlayerFrame(g: G, ox: number, oy: number, dir: number, frame: number) {
  const bob = frame % 2 === 1 ? 1 : 0;
  const y = oy + bob;
  const hair = C.purple, hood = C.teal, hoodDk = C.tealDk, pants = C.navy3;
  // shadow
  g.fillStyle = 'rgba(5,4,15,0.5)';
  g.fillRect(ox + 3, oy + 22, 10, 2);
  // legs
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  if (dir === 0 || dir === 3) {
    r(g, ox + 4, y + 17, 3, 5 + (step < 0 ? -1 : 0), pants);
    r(g, ox + 9, y + 17, 3, 5 + (step > 0 ? -1 : 0), pants);
    r(g, ox + 4, y + 21 + (step < 0 ? -1 : 0), 3, 1, C.off);
    r(g, ox + 9, y + 21 + (step > 0 ? -1 : 0), 3, 1, C.off);
  } else {
    r(g, ox + 5 + step, y + 17, 3, 5, pants);
    r(g, ox + 8 - step, y + 17, 3, 5, C.navy2);
    r(g, ox + 5 + step, y + 21, 3, 1, C.off);
    r(g, ox + 8 - step, y + 21, 3, 1, C.off2);
  }
  // body (hoodie)
  box(g, ox + 3, y + 10, 10, 8, hood);
  hl(g, ox + 4, y + 16, 8, hoodDk);
  if (dir === 0) {
    px(g, ox + 7, y + 11, C.gold);
    px(g, ox + 8, y + 11, C.gold);
    vl(g, ox + 7, y + 12, 2, C.gold2);
    vl(g, ox + 8, y + 12, 2, C.gold2);
    r(g, ox + 5, y + 14, 6, 2, hoodDk);
  }
  // arms
  const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  if (dir === 0 || dir === 3) {
    r(g, ox + 2, y + 11 + swing, 2, 6, hood);
    r(g, ox + 12, y + 11 - swing, 2, 6, hood);
    px(g, ox + 2, y + 16 + swing, C.skin);
    px(g, ox + 13, y + 16 - swing, C.skin);
  } else {
    r(g, ox + 7 + swing, y + 11, 3, 6, hoodDk);
    r(g, ox + 7 + swing, y + 16, 3, 1, C.skin);
  }
  // head
  box(g, ox + 3, y + 1, 10, 10, C.skin);
  if (dir === 3) {
    r(g, ox + 4, y + 2, 8, 8, hair);
    hl(g, ox + 5, y + 3, 4, C.purple2);
  } else {
    r(g, ox + 4, y + 2, 8, 3, hair);
    if (dir === 0) {
      px(g, ox + 4, y + 5, hair);
      px(g, ox + 11, y + 5, hair);
      r(g, ox + 5, y + 6, 2, 2, C.ink);
      r(g, ox + 9, y + 6, 2, 2, C.ink);
      px(g, ox + 5, y + 6, C.white);
      px(g, ox + 9, y + 6, C.white);
      hl(g, ox + 7, y + 9, 2, C.skin2);
    } else {
      const left = dir === 1;
      r(g, left ? ox + 9 : ox + 4, y + 2, 3, 7, hair);
      r(g, left ? ox + 5 : ox + 9, y + 6, 2, 2, C.ink);
      px(g, left ? ox + 5 : ox + 10, y + 6, C.white);
      px(g, left ? ox + 3 : ox + 12, y + 7, C.skin2);
    }
  }
  // hood rim
  hl(g, ox + 4, y + 10, 8, hoodDk);
}

function drawPlayer(g: G) {
  for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 4; f++) drawPlayerFrame(g, f * 16, dir * 24, dir, f);
}

// ---------------------------------------------------------------- tiles
const tiles: Record<string, Drawer> = {
  'tile.floor.wood': (g) => {
    // four long boards per tile, varied shade, sparse seams => reads as floorboards, not brick
    const shades = [C.wood2, '#734d35', '#6a4630', '#76503a'];
    for (let b = 0; b < 4; b++) {
      const y = b * 4;
      r(g, 0, y, 16, 4, shades[b]);
      hl(g, 0, y, 16, C.wood);
      hl(g, 0, y + 1, 16, b % 2 ? '#7f583d' : '#7a5339');
    }
    vl(g, 6, 5, 3, C.wood);
    vl(g, 13, 13, 3, C.wood);
    px(g, 3, 2, '#5f412d');
    px(g, 10, 10, '#5f412d');
    px(g, 12, 6, '#87603f');
  },
  'tile.floor.left': (g) => {
    r(g, 0, 0, 16, 16, C.purple2);
    for (let i = 0; i < 16; i += 2) for (let j = (i / 2) % 2; j < 16; j += 4) px(g, j, i, C.purple);
    px(g, 5, 9, C.purple3);
    px(g, 12, 3, C.purple3);
  },
  'tile.floor.right': (g) => {
    r(g, 0, 0, 16, 16, C.tealDk);
    for (let i = 1; i < 16; i += 3) for (let j = (i % 2) * 2; j < 16; j += 5) px(g, j, i, '#25706f');
    px(g, 3, 12, C.teal);
  },
  'tile.floor.hall': (g) => {
    r(g, 0, 0, 16, 16, C.navy2);
    box(g, 0, 0, 16, 16, C.navy3, C.navy2);
    r(g, 2, 2, 12, 12, C.navy2);
    px(g, 3, 3, C.grey2);
  },
  'tile.floor.vault': (g) => {
    r(g, 0, 0, 16, 16, '#1a1830');
    r(g, 0, 0, 16, 1, C.ink);
    r(g, 0, 0, 1, 16, C.ink);
    r(g, 8, 8, 8, 1, C.ink);
    px(g, 4, 5, C.purple);
    px(g, 11, 12, C.purple);
  },
  'tile.rug': (g) => {
    r(g, 0, 0, 16, 16, '#5a2d3f');
    for (let i = 0; i < 16; i += 4) {
      px(g, i + 1, 1, C.gold2);
      px(g, i + 3, 14, C.gold2);
    }
    r(g, 6, 6, 4, 4, '#7a3d52');
    px(g, 7, 7, C.gold);
  },
  'tile.wall': (g) => {
    r(g, 0, 0, 16, 16, '#b8b6b2');
    hl(g, 0, 15, 16, '#98979a');
    px(g, 3, 5, '#b2b0ad');
    px(g, 11, 10, '#c1beb8');
  },
  'tile.wall.cap': (g) => {
    r(g, 0, 0, 16, 16, C.navy);
    hl(g, 0, 12, 16, C.purple2);
    hl(g, 0, 13, 16, C.purple3);
    r(g, 0, 14, 16, 2, C.ink);
  },
  'tile.wall.side': (g) => {
    r(g, 0, 0, 16, 16, C.navy);
    hl(g, 0, 0, 16, C.navy2);
    px(g, 4, 6, C.navy2);
    px(g, 12, 11, C.navy2);
  },
};

// ---------------------------------------------------------------- sensors
const sensors: Record<string, Drawer> = {
  'obj.window.closed': (g) => {
    box(g, 0, 0, 32, 28, C.wood3);
    box(g, 3, 3, 26, 20, '#1b2a55');
    r(g, 4, 4, 24, 18, '#22336a');
    vl(g, 15, 3, 20, C.wood3);
    vl(g, 16, 3, 20, C.wood2);
    hl(g, 3, 13, 26, C.wood3);
    px(g, 7, 6, C.off);
    px(g, 22, 8, C.off2);
    r(g, 1, 24, 30, 3, C.wood2);
  },
  'obj.window.open': (g) => {
    box(g, 0, 0, 32, 28, C.wood3);
    box(g, 3, 3, 26, 20, '#0b1230');
    r(g, 4, 12, 24, 10, '#101a40');
    // raised sash
    box(g, 3, 2, 26, 9, '#22336a', C.wood2);
    vl(g, 16, 2, 9, C.wood3);
    // stars and moon
    px(g, 8, 15, C.off);
    px(g, 20, 18, C.off2);
    r(g, 23, 13, 3, 3, C.gold);
    // curtain fluttering in
    r(g, 3, 11, 3, 12, C.rose);
    px(g, 6, 14, C.rose);
    px(g, 7, 17, C.rose);
    r(g, 26, 11, 3, 12, C.rose);
    px(g, 25, 15, C.rose);
    r(g, 1, 24, 30, 3, C.wood2);
  },
  'obj.closet.latched': (g) => {
    shadow(g, 0, 42, 32);
    box(g, 0, 0, 32, 42, C.wood2);
    hl(g, 1, 1, 30, C.wood3);
    vl(g, 16, 1, 40, C.ink);
    box(g, 3, 4, 11, 34, C.wood3, C.wood);
    box(g, 18, 4, 11, 34, C.wood3, C.wood);
    r(g, 13, 20, 2, 3, C.gold);
    r(g, 17, 20, 2, 3, C.gold);
    r(g, 14, 21, 4, 1, C.gold2); // catch engaged
  },
  'obj.closet.ajar': (g) => {
    shadow(g, 0, 42, 32);
    box(g, 0, 0, 32, 42, C.ink);
    r(g, 1, 1, 30, 40, '#100c1c');
    // hanging clothes in darkness
    r(g, 18, 6, 3, 14, C.purple2);
    r(g, 22, 6, 3, 12, C.tealDk);
    hl(g, 17, 5, 12, C.grey2);
    box(g, 0, 0, 16, 42, C.wood2);
    box(g, 3, 4, 11, 34, C.wood3, C.wood);
    // right door swung open (thin, angled)
    box(g, 26, 2, 6, 40, C.wood3);
    vl(g, 27, 4, 36, C.wood2);
    r(g, 13, 20, 2, 3, C.gold);
    px(g, 28, 21, C.gold);
  },
  'obj.trash.empty': (g) => {
    shadow(g, 0, 18, 16);
    box(g, 2, 4, 12, 15, C.steel2);
    hl(g, 3, 5, 10, C.ink);
    r(g, 3, 6, 10, 2, '#1a1d2e');
    box(g, 1, 2, 14, 3, C.steel);
    for (let x = 4; x < 13; x += 3) vl(g, x, 9, 9, C.steel);
  },
  'obj.trash.full': (g) => {
    shadow(g, 0, 18, 16);
    box(g, 2, 6, 12, 13, C.steel2);
    for (let x = 4; x < 13; x += 3) vl(g, x, 9, 9, C.steel);
    // overflowing paper and takeout
    box(g, 3, 1, 6, 6, C.off);
    hl(g, 4, 3, 4, C.grey);
    box(g, 8, 2, 6, 5, C.red);
    px(g, 10, 3, C.off);
    box(g, 0, 4, 6, 3, C.steel, C.ink); // lid propped
  },
  'obj.couch.clean': (g) => drawCouch(g, false),
  'obj.couch.stained': (g) => drawCouch(g, true),
  'obj.clock.stopped': (g) => drawClock(g, false),
  'obj.clock.ticking': (g) => drawClock(g, true),
  'obj.lamp.dark': (g) => drawLamp(g, false),
  'obj.lamp.lit': (g) => drawLamp(g, true),
  'obj.sink.dry': (g) => drawSink(g, false),
  'obj.sink.dripping': (g) => drawSink(g, true),
  'obj.radiator.cold': (g) => drawRadiator(g, false),
  'obj.radiator.warm': (g) => drawRadiator(g, true),
};

function drawCouch(g: G, stained: boolean) {
  shadow(g, 0, 26, 48);
  box(g, 0, 4, 48, 22, '#687578');
  box(g, 0, 2, 7, 22, '#7e8889');
  box(g, 41, 2, 7, 22, '#7e8889');
  box(g, 6, 2, 36, 9, '#929b9b');
  for (const x of [7, 19, 30]) box(g, x, 12, 12, 10, '#879293', '#647075');
  hl(g, 7, 22, 34, C.purple);
  r(g, 2, 24, 3, 3, C.wood);
  r(g, 43, 24, 3, 3, C.wood);
  if (stained) {
    r(g, 22, 14, 5, 4, '#4a3020');
    r(g, 21, 15, 2, 2, '#4a3020');
    px(g, 27, 17, '#4a3020');
    px(g, 24, 18, '#4a3020');
  }
}

function drawClock(g: G, ticking: boolean) {
  r(g, 3, 0, 10, 16, C.ink);
  r(g, 0, 3, 16, 10, C.ink);
  r(g, 1, 1, 14, 14, C.ink);
  r(g, 4, 1, 8, 14, C.gold2);
  r(g, 1, 4, 14, 8, C.gold2);
  r(g, 2, 2, 12, 12, C.gold2);
  r(g, 3, 3, 10, 10, C.off);
  r(g, 4, 2, 8, 12, C.off);
  r(g, 2, 4, 12, 8, C.off);
  px(g, 8, 3, C.ink);
  px(g, 12, 8, C.ink);
  px(g, 8, 12, C.ink);
  px(g, 3, 8, C.ink);
  vl(g, 8, 5, 3, C.ink);
  if (ticking) {
    hl(g, 8, 8, 3, C.ink);
    px(g, 6, 10, C.red);
    px(g, 5, 11, C.red);
  } else {
    hl(g, 5, 8, 3, C.ink);
    px(g, 10, 10, C.grey);
  }
}

function drawLamp(g: G, lit: boolean) {
  if (lit) {
    g.fillStyle = 'rgba(242,196,109,0.35)';
    g.beginPath();
    g.arc(8, 14, 8, 0, Math.PI * 2);
    g.fill();
  }
  shadow(g, 0, 26, 16);
  box(g, 1, 15, 14, 4, C.wood3);
  r(g, 3, 19, 2, 8, C.wood);
  r(g, 11, 19, 2, 8, C.wood);
  r(g, 7, 9, 2, 6, C.gold2);
  r(g, 4, 14, 8, 1, C.gold2);
  // shade
  r(g, 4, 2, 8, 1, C.ink);
  r(g, 3, 3, 10, 6, C.ink);
  r(g, 5, 3, 6, 1, lit ? '#fff1c2' : C.off2);
  r(g, 4, 4, 8, 4, lit ? C.gold : C.grey);
  hl(g, 4, 7, 8, lit ? C.gold2 : C.grey2);
  if (lit) r(g, 6, 9, 4, 1, '#fff1c2');
}

function drawSink(g: G, dripping: boolean) {
  shadow(g, 0, 26, 32);
  box(g, 0, 8, 32, 19, C.wood2);
  hl(g, 1, 9, 30, C.wood3);
  box(g, 1, 6, 30, 5, C.steel);
  box(g, 8, 7, 16, 4, '#2a3048', C.steel2);
  // faucet
  r(g, 15, 1, 2, 6, C.steel);
  r(g, 15, 1, 6, 2, C.steel);
  r(g, 19, 3, 2, 2, C.steel2);
  box(g, 5, 13, 10, 11, C.wood3, C.wood);
  box(g, 17, 13, 10, 11, C.wood3, C.wood);
  px(g, 13, 18, C.gold);
  px(g, 18, 18, C.gold);
  if (dripping) {
    px(g, 20, 5, C.cyan);
    px(g, 20, 7, C.teal2);
    r(g, 16, 9, 7, 1, C.teal2);
  }
}

function drawRadiator(g: G, warm: boolean) {
  shadow(g, 0, 18, 32);
  for (let x = 1; x < 31; x += 4) box(g, x, 2, 4, 16, warm ? '#b0707a' : C.steel, C.ink);
  hl(g, 1, 6, 30, warm ? '#8a4f5c' : C.steel2);
  hl(g, 1, 14, 30, warm ? '#8a4f5c' : C.steel2);
  r(g, 0, 17, 32, 2, C.steel2);
  if (warm) {
    for (const x of [4, 13, 22, 28]) {
      px(g, x, 0, C.rose);
      px(g, x + 1, 1, C.red2);
    }
  } else {
    px(g, 5, 4, C.off);
    px(g, 21, 4, C.off);
  }
}

// ---------------------------------------------------------------- gadgets & furniture
function drawGramophone(g: G, harmonics: boolean) {
  shadow(g, 2, 38, 28);
  // stand
  box(g, 3, 20, 26, 19, C.wood2);
  hl(g, 4, 21, 24, C.wood3);
  box(g, 6, 26, 20, 9, C.wood, C.ink);
  // box + platter
  box(g, 2, 12, 28, 9, C.wood3);
  r(g, 5, 13, 18, 6, C.ink);
  r(g, 7, 14, 14, 4, '#1c1630');
  px(g, 14, 15, C.rose);
  // tonearm
  hl(g, 18, 13, 8, C.gold);
  px(g, 25, 14, harmonics ? C.cyan : C.gold2);
  if (harmonics) r(g, 23, 13, 3, 2, C.grey3);
  // horn
  r(g, 24, 4, 2, 9, C.gold2);
  r(g, 20, 0, 12, 2, C.gold);
  r(g, 21, 2, 10, 2, C.gold2);
  r(g, 23, 4, 5, 2, C.gold);
  px(g, 25, 1, '#fff1c2');
}

function drawCabinet(g: G, state: 'locked' | 'unlocked' | 'solved') {
  shadow(g, 0, 30, 32);
  box(g, 0, 2, 32, 29, '#2b2340');
  hl(g, 1, 3, 30, C.purple3);
  box(g, 3, 6, 26, 10, C.navy, C.gold2);
  // circuit: |0> -- [ ] -- M
  px(g, 5, 10, C.off);
  vl(g, 6, 9, 3, C.off);
  hl(g, 7, 11, 18, C.off2);
  box(g, 12, 8, 7, 7, state === 'solved' ? C.teal : C.navy2, C.off2);
  if (state === 'solved') {
    px(g, 14, 10, C.off);
    px(g, 16, 12, C.off);
    px(g, 15, 11, C.off);
    px(g, 16, 10, C.off);
    px(g, 14, 12, C.off);
  }
  box(g, 22, 9, 5, 5, C.grey2, C.off2);
  // lamp
  r(g, 11, 20, 10, 8, C.ink);
  r(g, 12, 21, 8, 6, state === 'solved' ? C.gold : state === 'unlocked' ? '#4a4030' : '#2a2620');
  if (state === 'solved') r(g, 14, 22, 3, 2, '#fff1c2');
  r(g, 25, 21, 4, 4, state === 'locked' ? C.grey2 : C.red2);
  px(g, 4, 22, C.gold2);
  px(g, 4, 25, C.gold2);
}

function drawListening(g: G, unlocked: boolean) {
  shadow(g, 0, 28, 40);
  box(g, 0, 10, 40, 10, C.wood3);
  r(g, 2, 20, 3, 9, C.wood);
  r(g, 35, 20, 3, 9, C.wood);
  // reel to reel
  for (const x of [6, 22]) {
    r(g, x, 3, 10, 10, C.ink);
    r(g, x + 1, 4, 8, 8, unlocked ? C.off2 : C.grey2);
    r(g, x + 4, 7, 2, 2, C.ink);
  }
  hl(g, 11, 12, 16, '#2a1c14');
  // headphones
  r(g, 31, 6, 2, 5, unlocked ? C.rose : C.grey2);
  r(g, 37, 6, 2, 5, unlocked ? C.rose : C.grey2);
  hl(g, 32, 4, 6, unlocked ? C.rose : C.grey2);
  if (unlocked) {
    px(g, 3, 13, C.teal2);
    px(g, 5, 13, C.gold);
  }
}

function drawLantern(g: G, open: boolean) {
  shadow(g, 0, 18, 12);
  r(g, 5, 0, 2, 3, C.gold2);
  box(g, 1, 3, 10, 2, C.gold2);
  box(g, 2, 5, 8, 11, open ? '#3d3420' : C.navy2, C.gold2);
  if (open) {
    r(g, 4, 7, 4, 7, C.gold);
    r(g, 5, 9, 2, 3, '#fff1c2');
  } else {
    for (let y = 6; y < 15; y += 2) hl(g, 3, y, 6, C.steel2);
  }
  box(g, 1, 16, 10, 3, C.gold2);
}

function drawSwitchboard(g: G, state: 'locked' | 'unlocked' | 'solved') {
  box(g, 0, 0, 40, 32, '#2a2238', C.wood);
  box(g, 2, 2, 36, 28, '#1a1428', C.gold2);
  // jacks (7)
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 5;
    r(g, x, 22, 3, 3, C.ink);
    px(g, x + 1, 23, C.gold);
  }
  // three lamps
  for (let i = 0; i < 3; i++) {
    const lit = state === 'solved' || (state === 'unlocked' && i === 0);
    r(g, 25 + i * 4, 5, 3, 3, lit ? C.gold : C.grey2);
  }
  // tangled wires
  g.strokeStyle = state === 'locked' ? C.grey2 : C.red2;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(6, 22);
  g.bezierCurveTo(10, 6, 20, 18, 26, 9);
  g.stroke();
  g.strokeStyle = state === 'locked' ? C.grey : C.teal2;
  g.beginPath();
  g.moveTo(16, 22);
  g.bezierCurveTo(8, 10, 24, 6, 30, 9);
  g.stroke();
  g.strokeStyle = state === 'locked' ? C.grey2 : C.gold;
  g.beginPath();
  g.moveTo(31, 22);
  g.bezierCurveTo(22, 14, 30, 12, 34, 9);
  g.stroke();
}

function drawMirror(g: G, state: 'locked' | 'unlocked' | 'solved') {
  shadow(g, 2, 34, 32);
  box(g, 2, 26, 32, 9, C.wood2);
  for (let i = 0; i < 3; i++) {
    const x = 4 + i * 10;
    r(g, x + 3, 18, 2, 8, C.wood);
    r(g, x, 6, 8, 12, C.ink);
    r(g, x + 1, 7, 6, 10, state === 'locked' ? C.grey2 : '#9fd8e8');
    px(g, x + 2, 8, C.white);
    vl(g, x + 4, 9, 6, C.grey);
  }
  if (state !== 'locked') {
    hl(g, 0, 11, 6, C.gold);
  }
  if (state === 'solved') {
    hl(g, 6, 11, 26, C.gold);
    vl(g, 31, 11, 15, C.gold);
    px(g, 31, 26, '#fff1c2');
  }
}

function drawToaster(g: G, unlocked: boolean) {
  // shelf
  box(g, 0, 18, 24, 4, C.wood3);
  r(g, 2, 22, 2, 6, C.wood);
  r(g, 20, 22, 2, 6, C.wood);
  // toaster
  box(g, 2, 6, 20, 12, unlocked ? '#d4d8e6' : C.steel);
  r(g, 5, 6, 4, 1, C.ink);
  r(g, 10, 6, 4, 1, C.ink);
  r(g, 15, 6, 4, 1, C.ink);
  hl(g, 3, 8, 18, C.white);
  r(g, 20, 10, 3, 2, C.ink);
  px(g, 5, 13, unlocked ? C.red2 : C.grey2);
  px(g, 6, 13, unlocked ? C.gold : C.grey2);
  if (unlocked) {
    r(g, 5, 3, 4, 3, '#d9a45f');
    r(g, 15, 3, 4, 3, '#d9a45f');
  } else {
    r(g, 9, 11, 6, 4, C.gold2);
    px(g, 11, 12, C.ink);
  }
}

function drawBed(g: G, color: string, accent: string) {
  shadow(g, 0, 46, 32);
  box(g, 0, 0, 32, 47, C.wood2);
  box(g, 2, 2, 28, 9, C.off);
  hl(g, 3, 9, 26, C.off2);
  box(g, 1, 12, 30, 33, color);
  for (let y = 16; y < 44; y += 6) hl(g, 2, y, 28, accent);
  hl(g, 2, 13, 28, C.off2);
}

const gadgets: Record<string, Drawer> = {
  'obj.gramophone': (g) => drawGramophone(g, false),
  'obj.gramophone.harmonics': (g) => drawGramophone(g, true),
  'obj.lever': (g) => {
    box(g, 1, 14, 6, 6, C.wood);
    r(g, 3, 3, 2, 12, C.gold2);
    vl(g, 3, 3, 12, C.gold);
    r(g, 1, 0, 6, 4, C.ink);
    r(g, 2, 1, 4, 2, C.red2);
  },
  'obj.hatch.closed': (g) => {
    box(g, 0, 0, 16, 8, C.gold2, C.goldDk);
    px(g, 2, 2, C.goldDk);
    px(g, 13, 2, C.goldDk);
    px(g, 2, 5, C.goldDk);
    px(g, 13, 5, C.goldDk);
  },
  'obj.hatch.open': (g) => {
    box(g, 0, 0, 16, 8, '#140f20', C.goldDk);
    box(g, 3, 2, 10, 5, C.grey3, C.ink);
    px(g, 5, 4, C.cyan);
    px(g, 10, 4, C.rose);
  },
  'obj.sleeves': (g) => {
    shadow(g, 0, 22, 20);
    box(g, 0, 14, 20, 9, C.wood2);
    const cols = [C.red, C.teal, C.gold2, C.purple3, C.navy3];
    cols.forEach((c, i) => box(g, 1 + i * 3.6, 2 + (i % 2) * 2, 4, 13, c));
  },
  'obj.cabinet.locked': (g) => drawCabinet(g, 'locked'),
  'obj.cabinet.unlocked': (g) => drawCabinet(g, 'unlocked'),
  'obj.cabinet.solved': (g) => drawCabinet(g, 'solved'),
  'obj.listening.locked': (g) => drawListening(g, false),
  'obj.listening.unlocked': (g) => drawListening(g, true),
  'obj.lantern.locked': (g) => drawLantern(g, false),
  'obj.lantern.unlocked': (g) => drawLantern(g, true),
  'obj.switchboard.locked': (g) => drawSwitchboard(g, 'locked'),
  'obj.switchboard.unlocked': (g) => drawSwitchboard(g, 'unlocked'),
  'obj.switchboard.solved': (g) => drawSwitchboard(g, 'solved'),
  'obj.mirror.locked': (g) => drawMirror(g, 'locked'),
  'obj.mirror.unlocked': (g) => drawMirror(g, 'unlocked'),
  'obj.mirror.solved': (g) => drawMirror(g, 'solved'),
  'obj.toaster.locked': (g) => drawToaster(g, false),
  'obj.toaster.unlocked': (g) => drawToaster(g, true),
  'obj.projector.broken': (g) => {
    shadow(g, 0, 18, 20);
    box(g, 2, 8, 16, 10, C.grey2);
    r(g, 0, 10, 4, 6, C.ink);
    r(g, 1, 11, 2, 4, '#202435');
    r(g, 6, 4, 4, 4, C.grey);
    r(g, 12, 4, 4, 4, C.grey);
    px(g, 10, 12, C.grey3);
  },
  'obj.projector.fixed': (g) => {
    shadow(g, 0, 18, 20);
    box(g, 2, 8, 16, 10, C.steel);
    r(g, 0, 10, 4, 6, C.ink);
    r(g, 1, 11, 2, 4, C.cyan);
    r(g, 6, 4, 4, 4, C.grey3);
    r(g, 12, 4, 4, 4, C.grey3);
    px(g, 10, 12, C.gold);
    px(g, 0, 9, C.rose);
  },
  'obj.metronome.broken': (g) => drawMetronome(g, false),
  'obj.metronome.fixed': (g) => drawMetronome(g, true),
  'obj.vault.locked': (g) => drawVault(g, false),
  'obj.vault.ready': (g) => drawVault(g, true),
};

function drawMetronome(g: G, fixed: boolean) {
  shadow(g, 0, 18, 12);
  g.fillStyle = C.ink;
  g.beginPath();
  g.moveTo(6, 0);
  g.lineTo(12, 19);
  g.lineTo(0, 19);
  g.closePath();
  g.fill();
  g.fillStyle = C.wood3;
  g.beginPath();
  g.moveTo(6, 2);
  g.lineTo(10.5, 18);
  g.lineTo(1.5, 18);
  g.closePath();
  g.fill();
  r(g, 4, 8, 4, 7, C.off2);
  g.strokeStyle = fixed ? C.gold : C.grey2;
  g.beginPath();
  g.moveTo(6, 15);
  g.lineTo(fixed ? 8.5 : 6, 4);
  g.stroke();
  if (fixed) px(g, 11, 10, C.gold);
}

function drawVault(g: G, ready: boolean) {
  box(g, 0, 0, 64, 60, C.steel2);
  box(g, 4, 4, 56, 52, '#3a3f58', C.ink);
  // rivets
  for (let x = 8; x < 58; x += 8) {
    px(g, x, 7, C.grey3);
    px(g, x, 52, C.grey3);
  }
  // dial with sixteen grooves
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(32, 30, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = ready ? '#2b2050' : '#262a3c';
  g.beginPath();
  g.arc(32, 30, 15, 0, Math.PI * 2);
  g.fill();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    px(g, Math.round(32 + Math.cos(a) * 12), Math.round(30 + Math.sin(a) * 12), ready ? (k % 2 ? C.cyan : C.rose) : C.grey2);
  }
  g.fillStyle = ready ? C.gold : C.steel;
  g.beginPath();
  g.arc(32, 30, 5, 0, Math.PI * 2);
  g.fill();
  r(g, 31, 22, 2, 6, C.ink);
  // cat silhouette hint on the plate
  px(g, 29, 47, C.grey3);
  px(g, 33, 47, C.grey3);
  r(g, 29, 48, 5, 3, C.grey3);
}

const objects: Record<string, Drawer> = {
  'obj.bed.left': (g) => drawBed(g, C.purple3, C.purple2),
  'obj.bed.right': (g) => {
    drawBed(g, C.teal, C.tealDk);
    // stuffed whale with headphones
    box(g, 9, 3, 12, 6, C.navy3);
    px(g, 11, 5, C.off);
    hl(g, 13, 2, 6, C.rose);
  },
  'obj.desk': (g) => {
    shadow(g, 0, 26, 48);
    box(g, 0, 6, 48, 8, C.wood3);
    hl(g, 1, 7, 46, '#a87a52');
    r(g, 2, 14, 3, 13, C.wood);
    r(g, 43, 14, 3, 13, C.wood);
    box(g, 30, 14, 14, 10, C.wood2);
    px(g, 37, 18, C.gold);
    // papers and mug
    box(g, 4, 2, 10, 6, C.off);
    hl(g, 6, 4, 6, C.grey);
    box(g, 18, 1, 5, 6, C.rose);
    r(g, 23, 3, 1, 2, C.rose);
  },
  'obj.notebook': (g) => {
    box(g, 0, 0, 12, 8, C.red);
    vl(g, 2, 1, 6, C.goldDk);
    hl(g, 4, 3, 6, C.gold);
    px(g, 10, 6, C.off);
  },
  'obj.jnote': (g) => {
    box(g, 0, 0, 10, 8, C.off);
    hl(g, 2, 2, 6, C.grey2);
    hl(g, 2, 4, 5, C.grey2);
    px(g, 7, 6, C.gold2);
  },
  'obj.bookshelf': (g) => {
    shadow(g, 0, 42, 32);
    box(g, 0, 0, 32, 43, C.wood2);
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 2 + shelf * 13;
      r(g, 2, y, 28, 11, '#2a1d14');
      const cols = [C.red, C.teal, C.gold2, C.purple3, C.navy3, C.green, C.off2, C.rose];
      for (let b = 0; b < 7; b++) r(g, 3 + b * 4, y + 2 + ((b + shelf) % 3), 3, 9 - ((b + shelf) % 3), cols[(b + shelf * 3) % cols.length]);
      hl(g, 1, y + 11, 30, C.wood3);
    }
  },
  'obj.bedsidebox': (g) => {
    shadow(g, 0, 10, 14);
    box(g, 0, 3, 14, 9, C.wood3);
    box(g, 0, 0, 14, 4, C.wood2);
    px(g, 7, 6, C.gold);
  },
  'obj.photo.small': (g) => {
    box(g, 0, 0, 16, 14, C.gold2);
    r(g, 2, 2, 12, 10, '#283a5c');
    r(g, 2, 8, 12, 4, C.wood2);
    r(g, 9, 3, 4, 3, '#0b1230');
    px(g, 5, 5, C.off);
  },
  'obj.clipping': (g) => {
    box(g, 0, 0, 12, 14, C.off2, '#3a2a1a');
    for (let y = 3; y < 12; y += 2) hl(g, 2, y, 8, C.grey2);
    px(g, 6, 0, C.red2);
  },
  'obj.portrait': (g) => {
    box(g, 0, 0, 20, 24, C.gold);
    box(g, 2, 2, 16, 20, '#33456b', C.goldDk);
    r(g, 7, 6, 6, 6, C.skin);
    r(g, 6, 5, 8, 3, C.wood2);
    r(g, 5, 13, 10, 8, C.rose);
    px(g, 8, 8, C.ink);
    px(g, 11, 8, C.ink);
  },
  'obj.poster': (g) => {
    box(g, 0, 0, 24, 32, '#20183a', C.off2);
    g.fillStyle = C.teal2;
    g.beginPath();
    g.arc(12, 12, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#20183a';
    g.beginPath();
    g.arc(12, 12, 5, 0, Math.PI * 2);
    g.fill();
    hl(g, 5, 12, 14, C.rose);
    vl(g, 12, 5, 14, C.gold);
    hl(g, 4, 24, 16, C.gold);
    hl(g, 6, 27, 12, C.off2);
  },
  'obj.stickynote': (g) => {
    r(g, 0, 0, 8, 8, '#f5e17a');
    hl(g, 1, 3, 6, C.wood2);
    hl(g, 1, 5, 4, C.wood2);
  },
  'obj.dresser': (g) => {
    shadow(g, 0, 28, 32);
    box(g, 0, 4, 32, 25, C.wood2);
    for (let i = 0; i < 3; i++) {
      box(g, 2, 7 + i * 7, 28, 6, C.wood3, C.wood);
      r(g, 14, 9 + i * 7, 4, 1, C.gold);
    }
    box(g, 0, 2, 32, 3, C.wood3);
    r(g, 22, 0, 6, 3, C.green);
  },
  'obj.coatrack': (g) => {
    shadow(g, 2, 30, 12);
    r(g, 7, 2, 2, 28, C.wood);
    r(g, 3, 29, 10, 2, C.wood);
    hl(g, 3, 4, 10, C.wood3);
    box(g, 2, 5, 8, 14, C.navy3);
    hl(g, 3, 6, 6, C.navy2);
  },
  'obj.mailbox': (g) => {
    box(g, 0, 2, 16, 12, C.gold2, C.goldDk);
    r(g, 3, 6, 10, 2, C.ink);
    px(g, 4, 10, C.off);
  },
  'obj.plaque': (g) => {
    box(g, 0, 0, 24, 12, C.gold2, C.goldDk);
    hl(g, 3, 4, 18, C.goldDk);
    hl(g, 5, 7, 14, C.goldDk);
  },
  'obj.door.top': (g) => drawTopDoor(g, C.wood2),
  'obj.door.vault': (g) => drawTopDoor(g, C.steel2),
  'obj.door.bottom': (g) => {
    r(g, 0, 0, 32, 16, C.navy);
    r(g, 2, 0, 28, 16, '#0c0a18');
    hl(g, 2, 0, 28, C.gold2);
    r(g, 4, 4, 24, 8, '#191430');
  },
  'obj.door.side': (g) => {
    r(g, 0, 0, 16, 32, '#0c0a18');
    vl(g, 0, 0, 32, C.gold2);
    vl(g, 15, 0, 32, C.gold2);
    hl(g, 0, 0, 16, C.gold2);
    r(g, 3, 3, 10, 26, '#191430');
    px(g, 8, 16, C.gold);
  },
  'obj.door.front': (g) => {
    r(g, 0, 0, 32, 16, C.wood2);
    hl(g, 0, 0, 32, C.wood3);
    box(g, 3, 2, 26, 12, C.red, C.ink);
    px(g, 24, 8, C.gold);
    hl(g, 6, 5, 20, '#8e2c32');
  },
  'deco.plant': (g) => {
    shadow(g, 2, 22, 12);
    box(g, 3, 15, 10, 8, '#9b5a3c');
    r(g, 7, 6, 2, 9, C.green);
    r(g, 3, 4, 5, 5, C.green);
    r(g, 8, 2, 5, 6, '#4a8a4a');
    r(g, 2, 9, 4, 3, '#4a8a4a');
    r(g, 10, 9, 4, 4, C.green);
  },
  'deco.boxes': (g) => {
    shadow(g, 0, 18, 24);
    box(g, 0, 8, 14, 11, '#b8925a');
    box(g, 10, 2, 13, 17, '#c9a46a');
    hl(g, 11, 9, 11, '#8a6a3a');
    hl(g, 1, 13, 12, '#8a6a3a');
  },
  'deco.shoes': (g) => {
    box(g, 0, 2, 7, 5, C.red);
    box(g, 8, 3, 7, 5, C.navy3);
    hl(g, 1, 6, 5, C.off);
  },
  'deco.stool': (g) => {
    shadow(g, 0, 10, 12);
    box(g, 0, 0, 12, 5, C.wood3);
    r(g, 1, 5, 2, 6, C.wood);
    r(g, 9, 5, 2, 6, C.wood);
  },
  'deco.table': (g) => {
    shadow(g, 0, 14, 32);
    box(g, 0, 2, 32, 8, C.wood3);
    hl(g, 1, 3, 30, '#a87a52');
    r(g, 2, 10, 2, 5, C.wood);
    r(g, 28, 10, 2, 5, C.wood);
    box(g, 6, 0, 6, 4, C.off2);
    box(g, 20, 1, 4, 4, C.teal);
  },
  'deco.fridge': (g) => {
    shadow(g, 0, 34, 20);
    box(g, 0, 0, 20, 35, '#d9dce8');
    hl(g, 1, 12, 18, C.grey);
    r(g, 16, 4, 2, 6, C.grey2);
    r(g, 16, 15, 2, 8, C.grey2);
    box(g, 4, 17, 5, 6, C.gold);
    px(g, 6, 19, C.red);
  },
  'deco.armchair': (g) => {
    shadow(g, 0, 22, 24);
    box(g, 0, 2, 24, 20, C.tealDk);
    box(g, 0, 0, 6, 20, C.teal);
    box(g, 18, 0, 6, 20, C.teal);
    box(g, 5, 8, 14, 10, '#3aa09a', C.tealDk);
    r(g, 2, 21, 2, 2, C.wood);
    r(g, 20, 21, 2, 2, C.wood);
  },
  'deco.shelf': (g) => {
    box(g, 0, 6, 24, 4, C.wood3);
    box(g, 2, 0, 5, 6, C.teal);
    box(g, 9, 2, 4, 4, C.rose);
    box(g, 15, 1, 7, 5, C.off2);
  },
};

function drawTopDoor(g: G, door: string) {
  r(g, 0, 0, 32, 48, C.ink);
  r(g, 2, 2, 28, 46, '#0c0a18');
  hl(g, 1, 1, 30, C.gold2);
  vl(g, 1, 1, 47, C.gold2);
  vl(g, 30, 1, 47, C.gold2);
  r(g, 4, 6, 24, 42, door);
  r(g, 6, 9, 9, 14, '#00000033');
  r(g, 17, 9, 9, 14, '#00000033');
  r(g, 6, 27, 9, 17, '#00000033');
  r(g, 17, 27, 9, 17, '#00000033');
  px(g, 24, 30, C.gold);
}

const items: Record<string, Drawer> = {
  'item.prism': (g) => {
    g.fillStyle = C.ink;
    g.beginPath();
    g.moveTo(8, 1);
    g.lineTo(15, 14);
    g.lineTo(1, 14);
    g.closePath();
    g.fill();
    g.fillStyle = '#bfefff';
    g.beginPath();
    g.moveTo(8, 3);
    g.lineTo(13.5, 13);
    g.lineTo(2.5, 13);
    g.closePath();
    g.fill();
    vl(g, 7, 5, 7, C.white);
    hl(g, 9, 9, 2, C.rose);
    hl(g, 9, 10, 3, C.gold);
    hl(g, 9, 11, 4, C.teal2);
  },
  'item.cassette': (g) => {
    box(g, 0, 3, 16, 11, C.red);
    box(g, 2, 5, 12, 5, C.off);
    r(g, 4, 6, 3, 3, C.ink);
    r(g, 9, 6, 3, 3, C.ink);
    hl(g, 4, 12, 8, '#8e2c32');
  },
  'item.key': (g) => {
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(5, 8, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.gold;
    g.beginPath();
    g.arc(5, 8, 3.5, 0, Math.PI * 2);
    g.fill();
    r(g, 4, 7, 2, 2, C.ink);
    r(g, 9, 7, 6, 3, C.ink);
    r(g, 9, 8, 6, 1, C.gold);
    r(g, 13, 9, 2, 3, C.gold2);
  },
  'item.notebook': (g) => {
    box(g, 2, 1, 12, 14, C.red);
    vl(g, 4, 2, 12, C.goldDk);
    hl(g, 6, 5, 6, C.gold);
    hl(g, 6, 7, 5, C.gold);
    px(g, 11, 12, C.off);
  },
  'item.cartridge': (g) => {
    box(g, 1, 3, 14, 10, C.grey3);
    r(g, 3, 5, 10, 3, C.navy2);
    px(g, 5, 6, C.cyan);
    px(g, 10, 6, C.rose);
    hl(g, 3, 10, 10, C.steel2);
    r(g, 12, 12, 2, 3, C.gold);
  },
  'fx.note': (g) => {
    r(g, 5, 0, 1, 7, C.off);
    r(g, 5, 0, 3, 1, C.off);
    r(g, 7, 1, 1, 2, C.off);
    r(g, 1, 6, 5, 3, C.off);
    r(g, 2, 9, 3, 1, C.off);
  },
  'fx.ghost': (g) => {
    g.fillStyle = 'rgba(111,243,255,0.8)';
    g.beginPath();
    g.arc(5, 4, 4, Math.PI, 0);
    g.fill();
    r(g, 1, 4, 8, 4, 'rgba(111,243,255,0.8)');
    px(g, 1, 8, 'rgba(111,243,255,0.8)');
    px(g, 5, 8, 'rgba(111,243,255,0.8)');
    px(g, 8, 8, 'rgba(111,243,255,0.8)');
    px(g, 3, 3, C.ink);
    px(g, 6, 3, C.ink);
  },
  'fx.prompt': (g) => {
    box(g, 0, 0, 9, 9, C.off);
    r(g, 3, 2, 3, 1, C.ink);
    r(g, 3, 2, 1, 5, C.ink);
    r(g, 3, 4, 2, 1, C.ink);
    r(g, 3, 6, 3, 1, C.ink);
  },
};

export const PROCEDURAL: Record<string, Drawer> = {
  player: (g) => drawPlayer(g),
  ...tiles,
  ...sensors,
  ...gadgets,
  ...objects,
  ...items,
  ...DORM,
  'obj.window.open': bayWindow,
  'obj.window.closed': bayWindow,
  'obj.bed.left': dormBed('#425a74'),
  'obj.bed.right': dormBed('#899b94'),
};

/** Unresolved (ECHO timeline) variant: superpose both physical states with cyan/rose ghosting. */
export function compositeUnresolved(g: G, w: number, h: number, a: CanvasImageSource, b: CanvasImageSource) {
  const tint = (src: CanvasImageSource, color: string) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = c.getContext('2d')!;
    t.drawImage(src, 0, 0, w, h);
    t.globalCompositeOperation = 'source-atop';
    t.fillStyle = color;
    t.fillRect(0, 0, w, h);
    return c;
  };
  g.globalAlpha = 0.85;
  g.drawImage(a, 0, 0, w, h);
  g.globalAlpha = 0.55;
  g.drawImage(b, 0, 0, w, h);
  g.globalAlpha = 0.5;
  g.drawImage(tint(a, 'rgba(111,243,255,0.55)'), -1, 0);
  g.drawImage(tint(b, 'rgba(228,107,143,0.55)'), 1, 0);
  g.globalAlpha = 1;
}
