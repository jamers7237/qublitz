// Browser smoke test: launches the Vite dev server and drives the REAL game in Chrome.
// Usage: npm run smoke   (requires Google Chrome, or set CHROME_PATH / use `npx playwright install chromium`)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright';

const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const OUT = path.resolve('smoke-screenshots');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- tiny PNG encoder (for the art-replacement test)
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('dev server timeout')), 30000);
  server.stdout.on('data', (d) => { if (String(d).includes('Local')) { clearTimeout(t); res(); } });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const browser = await chromium.launch({ channel: process.env.CHROME_PATH ? undefined : 'chrome', executablePath: process.env.CHROME_PATH, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
let page;
// Low-disk runs can still verify every interaction without saving PNGs.
const snap = (options) => process.env.SMOKE_SCREENSHOTS === '0' ? Promise.resolve() : page.screenshot(options);
const sh = (fn, arg) => page.evaluate(fn, arg);
const ui = () => sh(() => window.__sh.uiStore.get());
const gs = () => sh(() => window.__sh.gameStore.get());
async function drain(max = 60) {
  for (let i = 0; i < max; i++) {
    const u = await ui();
    if (!u.dialogue.length) {
      // rewind / echo animations intentionally block input briefly
      await page.waitForFunction(() => !window.__sh.uiStore.get().effect || window.__sh.uiStore.get().effect.kind === 'vaultOpen', null, { timeout: 4000 }).catch(() => {});
      if ((await ui()).dialogue.length) continue;
      return;
    }
    const l = u.dialogue[0];
    if (l.choices?.length) await sh((id) => window.__sh.advanceDialogue(id), l.choices[0].id);
    else await page.keyboard.press('e');
    await page.waitForTimeout(60);
  }
}
async function toScreen(x, y) {
  const b = await page.locator('canvas').boundingBox();
  const z = b.width / 512;
  return { x: b.x + x * z, y: b.y + y * z };
}
// Read the current hotspot geometry so room-size edits cannot leave stale clicks.
async function screenObject(id) {
  const point = await sh((objectId) => {
    const scene = window.__game.scene.getScene('world');
    const view = scene.views.find(v => v.placed.id === objectId);
    if (!view) throw new Error(`Missing world object: ${objectId}`);
    const rect = view.hitRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, id);
  return toScreen(point.x, point.y);
}
async function clickObject(id) {
  const p = await screenObject(id);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(350);
}
async function waitRoom(room) {
  await page.waitForFunction((r) => window.__sh.gameStore.get().room === r, room, { timeout: 5000 });
  await page.waitForTimeout(450);
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(BASE + '?seed=4242');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-testid=title]');
  await snap({ path: `${OUT}/01-title.png` });
  check('title screen renders', true);
  const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('12px "Press Start 2P"') && document.fonts.check('16px "Pixelify Sans"'); });
  check('bundled pixel fonts load offline', fontsOk);

  await page.click('[data-testid=new-game]');
  await page.fill('[data-testid=name-input]', 'Ada');
  await snap({ path: `${OUT}/02-name.png` });
  await page.click('[data-testid=begin]');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1200);
  await snap({ path: `${OUT}/03-foyer-intro.png` });
  check('game canvas boots with intro dialogue', (await ui()).dialogue.length > 0);
  const zoom = (await page.locator('canvas').boundingBox()).width / 512;
  check('integer pixel scaling at 1280x800', Number.isInteger(zoom), `zoom=${zoom}`);
  await drain();

  // walk north with the keyboard into the common room -> first fresh timeline
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__sh.gameStore.get().room === 'common', null, { timeout: 8000 });
  await page.keyboard.up('w');
  await page.waitForTimeout(700);
  let s = await gs();
  check('walking in from the foyer prepares exactly one shot', s.journal.shots.length === 1 && s.timeline.status === 'active', `shots=${s.journal.shots.length}`);
  await snap({ path: `${OUT}/04-common-first-note.png` });
  await drain();

  // hover outline + prompt on the window
  const w = await screenObject('window');
  await page.mouse.move(w.x, w.y);
  await page.waitForTimeout(250);
  const prompt = await page.locator('[data-testid=prompt]').textContent().catch(() => '');
  check('mouse hover shows interact prompt', /window/i.test(prompt ?? ''), prompt ?? '');
  const ring = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('world');
    return sc.children.list.some((o) => o.texture?.key?.endsWith('__ring') && o.visible);
  });
  check('white outline overlay visible on hover', ring);
  await snap({ path: `${OUT}/05-hover-window.png`, clip: { x: w.x - 120, y: w.y - 90, width: 300, height: 220 } });
  await page.mouse.click(w.x, w.y);
  await page.waitForTimeout(300);
  const d = (await ui()).dialogue.map((l) => l.text).join(' ');
  check('click-to-inspect opens descriptive (non-binary) text', /window/i.test(d) && !/\b[01]\b/.test(d), d.slice(0, 80));
  await drain();
  await clickObject('sink');
  const bottleText = (await ui()).dialogue.map(l => l.text).join(' ');
  check('address 7 is a floor juice bottle with sealed/spilled states', /juice bottle/i.test(bottleText) && /sealed|tipped over|stain/.test(bottleText) && !/sink|faucet/i.test(bottleText));
  await drain();
  // decorative plant must not glow
  const plant = await screenObject('deco.plant');
  await page.mouse.move(plant.x, plant.y);
  await page.waitForTimeout(200);
  check('decor does not highlight', (await ui()).hovered === null);

  // prologue: vault -> forced rewind
  await clickObject('door.common.north'); // north door
  await waitRoom('vault');
  await snap({ path: `${OUT}/06-vault-room.png` });
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault');
  await drain();
  await page.waitForTimeout(900);
  s = await gs();
  check('vault in prologue rewinds to foyer, journal preserved', s.room === 'foyer' && s.flags.firstRewind && s.journal.shots.length === 1);
  await drain();

  // second timeline, left first, lever => knock only
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault');
  await waitRoom('common');
  await drain();
  await clickObject('door.common.west');
  await waitRoom('left');
  await drain();
  await snap({ path: `${OUT}/07-left-bedroom.png` });
  await clickObject('door.left.east');
  await waitRoom('common');
  s = await gs();
  check('route buffer recorded Left on entry', s.route === 'L', s.route);
  const before = JSON.stringify(s.journal);
  await clickObject('lever'); // lever
  await page.waitForTimeout(400);
  const u2 = await ui();
  s = await gs();
  check('Left-first lever: no popup, no log, buffer cleared', u2.dialogue.length === 0 && u2.panel === null && JSON.stringify(s.journal) === before && s.route === '', `dialogue=${u2.dialogue.length}`);

  // notebook under left desk
  await clickObject('door.common.west');
  await waitRoom('left');
  await drain();
  await clickObject('notebook');
  await drain();
  check('notebook match minigame opens', JSON.stringify((await ui()).panel).includes('notebookMatch'));
  await snap({ path: `${OUT}/08-notebook-match.png` });
  const buttons = page.getByRole('button', { name: 'This one' });
  for (let i = 0; i < 3; i++) {
    if (!(await gs()).inventory.keyItems.includes('notebook')) await buttons.nth(i).click().catch(() => {});
  }
  check('notebook acquired via the match puzzle', (await gs()).inventory.keyItems.includes('notebook'));
  await drain();
  await page.keyboard.press('n');
  await page.waitForTimeout(300);
  await snap({ path: `${OUT}/09-notebook.png` });
  await page.getByRole('tab', { name: 'House Manual' }).click();
  await page.getByLabel('Route guess for row 3').fill('R R');
  await page.getByLabel('Notes for row 3').fill('typing wasd e works');
  s = await gs();
  check('House Manual accepts typing (incl. W/A/S/D/E keys)', s.manual[2].route === 'R R' && s.manual[2].notes === 'typing wasd e works');
  await snap({ path: `${OUT}/10-house-manual.png` });
  await page.keyboard.press('Escape');

  // checkpoint (debug) -> vault solve -> ending
  await page.goto(BASE + '?debug=1&seed=4242');
  await page.waitForSelector('[data-testid=title]');
  await page.click('text=Continue');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'tools' }).click();
  await page.getByRole('button', { name: 'vault', exact: true }).first().click();
  await page.waitForTimeout(600);
  await drain();
  await snap({ path: `${OUT}/11-debug-checkpoint.png` });
  await page.getByRole('button', { name: 'quantum' }).click();
  await snap({ path: `${OUT}/12-debug-quantum.png` });
  await page.getByRole('button', { name: '▼' }).click();
  // fresh live shot from the foyer, then the vault
  await sh(() => window.__sh.session.loadCheckpoint('vault'));
  await drain();
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault');
  await waitRoom('common');
  await drain();
  check('checkpoint still allows a fresh live measurement', (await gs()).journal.shots.some((x) => x.source === 'timeline'));
  await clickObject('door.common.north');
  await waitRoom('vault');
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault');
  await drain();
  check('vault sequencer opens when ready', JSON.stringify((await ui()).panel).includes('vault'));
  await snap({ path: `${OUT}/13-vault-sequencer.png` });
  // wrong chord first: rewind, same secret
  const secret = await sh(() => ({ seed: window.__sh.gameStore.get().seed, phase: window.__sh.gameStore.get().phase }));
  await sh(() => { const p = window.__sh.puzzles; p.setVaultOrder(window.__sh.correctScore()); });
  await page.getByRole('button', { name: secret.phase ? 'C major' : 'C minor' }).click();
  await page.click('[data-testid=vault-submit]');
  await page.waitForTimeout(500);
  s = await gs();
  check('wrong vault answer rewinds with the same secret', s.room === 'foyer' && s.seed === secret.seed && s.phase === secret.phase);
  await snap({ path: `${OUT}/14-wrong-vault-rewind.png` });
  await drain();
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault'); await waitRoom('common'); await drain();
  await clickObject('door.common.north'); await waitRoom('vault');
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault'); await drain();
  await page.getByRole('button', { name: secret.phase ? 'C minor' : 'C major' }).click();
  await page.click('[data-testid=vault-submit]');
  await page.waitForTimeout(400);
  await drain();
  await page.waitForSelector('[data-testid=ending]', { timeout: 5000 });
  check('correct score + chord opens the vault -> ending', true);
  const btn = (name) => page.getByRole('button', { name, exact: true });
  await btn('Open the box').click();
  await btn('Dead').click();
  await page.waitForTimeout(2000);
  check('"dead" is a fake reset that asks again', (await page.textContent('body')).includes('No cats were harmed'));
  await btn('Alive').click();
  await page.waitForTimeout(300);
  await snap({ path: `${OUT}/15-cat-alive.png` });
  await btn('…').click();
  await snap({ path: `${OUT}/16-james-joke.png` });
  await btn('Continue').click();
  await snap({ path: `${OUT}/17-victory-stats.png` });

  // ---- minigame sweep: every overlay renders; solve mirror / ledger / toaster through the real UI
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror(sweep): ${e.message}`));
  await page.goto(BASE + '?debug=1&seed=4242');
  await page.waitForSelector('[data-testid=title]');
  await page.click('text=Continue');
  await page.waitForSelector('canvas');
  await sh(() => window.__sh.session.loadCheckpoint('midpoint'));
  await drain();
  await page.getByRole('button', { name: '▼' }).click();
  const open = (id) => sh((x) => window.__sh.uiStore.update((u) => void (u.panel = { kind: 'minigame', id: x })), id);
  for (const id of ['calibration', 'listening', 'switchboard', 'lantern', 'gramophone']) {
    await open(id);
    await page.waitForTimeout(250);
    await snap({ path: `${OUT}/mg-${id}.png` });
    await page.keyboard.press('Escape');
  }
  // listening: flip a wire (classical audition, no new shot)
  await open('listening');
  const shotsBefore = (await gs()).journal.shots.length;
  await page.getByRole('button', { name: 'flip #4' }).click();
  check('Listening Desk flip audition does not create a shot', (await gs()).journal.shots.length === shotsBefore);
  await page.keyboard.press('Escape');
  // switchboard: patch a true relation via the UI
  await open('switchboard');
  for (const j of ['#6', '#2', '#4']) await page.getByRole('button', { name: j, exact: true }).click();
  await page.getByRole('button', { name: 'Patch' }).click();
  check('Switchboard UI patch reports consistency', /Already lit|steady glow/.test(await page.textContent('.modal')));
  await page.keyboard.press('Escape');
  // mirror: solve through clicks, checking the two intermediate states
  await open('mirror');
  const shard = (k) => page.locator(`[aria-label^="Shard ${k},"]`);
  await shard(1).click();
  const mid1 = await page.textContent('.modal');
  await shard(2).click();
  const mid2 = await page.textContent('.modal');
  await snap({ path: `${OUT}/mg-mirror-partial.png` });
  for (let i = 0; i < 3; i++) await shard(3).click();
  check('Mirror shows intermediate beam states then opens the latch', /threads two|first shard/.test(mid1 + mid2) && (await gs()).puzzles.mirror.solved);
  await snap({ path: `${OUT}/mg-mirror-solved.png` });
  await drain();
  await page.keyboard.press('Escape');
  // cartridge + ledger + toaster on the late checkpoint
  await sh(() => window.__sh.session.loadCheckpoint('late'));
  await drain();
  await open('cartridge');
  await snap({ path: `${OUT}/mg-cartridge.png` });
  await page.keyboard.press('Escape');
  await open('ledger');
  const tile = (t) => page.getByRole('button', { name: `ratio ${t} to 1` });
  const slot = (a) => page.locator(`[aria-label^="switch ${a}"]`);
  for (const [a, t] of [[2, 2], [3, 3], [4, 5], [5, 7]]) { await tile(t).click(); await slot(a).click(); }
  await snap({ path: `${OUT}/mg-ledger.png` });
  await page.getByRole('button', { name: 'Balance the ledger' }).click();
  await drain();
  check('Prime Ledger solved through tile placement', (await gs()).puzzles.ledger.solved);
  await page.keyboard.press('Escape');
  await open('toaster');
  const pair = await sh(() => window.__sh.puzzles.toasterQuizPair(window.__sh.gameStore.get()));
  const bestIdx = pair[0].count > pair[1].count ? 0 : 1;
  await page.getByRole('button', { name: 'This one' }).nth(bestIdx).click();
  await page.getByRole('button', { name: /evidence, not certainty/ }).click();
  await drain();
  const nShots = (await gs()).journal.shots.length;
  const tl = JSON.stringify((await gs()).timeline);
  await page.getByRole('button', { name: /4 independent copies/ }).click();
  await page.waitForTimeout(300);
  await drain();
  const g2 = await gs();
  check('Toaster: quiz unlocks it; one press = 4 shots; timeline untouched', g2.journal.shots.length === nShots + 4 && JSON.stringify(g2.timeline) === tl);
  await snap({ path: `${OUT}/mg-toaster.png` });
  await page.keyboard.press('Escape');
  // notebook pages all render
  await page.keyboard.press('n');
  for (const tab of ['Loops', 'House Manual', 'Room Symbols', 'Sound Comparison', 'Parity Notes', 'Prime Ledger', 'Phase / Echo', 'Draft Score']) {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForTimeout(120);
    await snap({ path: `${OUT}/nb-${tab.replace(/[^a-z]/gi, '')}.png` });
  }
  check('all eight notebook pages render', true);
  await page.keyboard.press('Escape');
  await page.close();

  // narrow viewport
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page = await narrow.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror(narrow): ${e.message}`));
  await page.goto(BASE + '?seed=7');
  await page.click('[data-testid=new-game]');
  await page.fill('[data-testid=name-input]', 'Mo');
  await page.click('[data-testid=begin]');
  await page.waitForTimeout(1200);
  await snap({ path: `${OUT}/18-narrow-phone.png` });
  const hasPad = await page.locator('[aria-label="Movement pad"]').count();
  check('narrow/touch viewport shows on-screen controls', hasPad === 1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no horizontal scroll on phone width', !overflow);
  await narrow.close();

  // art replacement: drop a teammate PNG at the manifest path; outline + hitbox must still work
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror(art): ${e.message}`));
  const winPath = path.resolve('public/assets/sprites/objects/window_open.png');
  const photoPath = path.resolve('public/assets/photos/james.jpg');
  fs.mkdirSync(path.dirname(winPath), { recursive: true });
  fs.writeFileSync(winPath, png(128, 44, (x, y) => (x === 0 || y === 0 || x === 127 || y === 43 ? [10, 8, 20, 255] : (x + y) % 6 < 3 ? [255, 120, 40, 255] : [40, 200, 120, 255])));
  fs.writeFileSync(photoPath, png(240, 300, (x, y) => [(x * 255) / 240, 80, (y * 255) / 300, 255]));
  await page.waitForTimeout(1200);
  await page.goto(BASE + '?debug=1&seed=4242');
  await page.waitForSelector('[data-testid=title]');
  await page.click('text=Continue');
  await page.waitForTimeout(1000);
  await sh(() => window.__sh.session.loadCheckpoint('midpoint'));
  await drain();
  await clickObject((await gs()).room === 'foyer' ? 'door.foyer.north' : 'vault');
  await waitRoom('common');
  await drain();
  const loaded = await sh(() => window.__sh.loadReport.loaded);
  check('replacement sprite loaded from manifest path', loaded.includes('obj.window.open'));
  const w2 = await screenObject('window');
  await page.mouse.move(w2.x, w2.y);
  await page.waitForTimeout(250);
  const ring2 = await page.evaluate(() => window.__game.scene.getScene('world').children.list.some((o) => o.texture?.key === 'obj.window.open__ring' && o.visible));
  check('replaced sprite inherits the white hover outline', ring2);
  await snap({ path: `${OUT}/19-replaced-sprite-hover.png`, clip: { x: w2.x - 120, y: w2.y - 90, width: 300, height: 220 } });
  await clickObject('door.common.east');
  await waitRoom('right');
  await snap({ path: `${OUT}/21-compact-right-bedroom.png` });
  await clickObject('portrait');
  await drain();
  await page.waitForTimeout(300);
  const imgOk = await page.evaluate(() => [...document.querySelectorAll('.photo-frame img')].some((i) => i.src.includes('james.jpg') && i.naturalWidth > 0));
  check('replacement photo renders in the zoom modal (only on click)', imgOk);
  await snap({ path: `${OUT}/20-photo-modal.png` });
  fs.unlinkSync(winPath);
  fs.unlinkSync(photoPath);
} catch (e) {
  check('smoke run completed without exceptions', false, String(e?.stack ?? e));
  try {
    const u = await ui();
    const g = await gs();
    const sc = await page.evaluate(() => { const w = window.__game.scene.getScene('world'); return { transitioning: w.transitioning, sceneRoom: w.room?.id, fade: w.cameras.main.fadeEffect.isRunning, flash: w.cameras.main.flashEffect.isRunning, lastClosed: window.__sh.uiStore.get().lastClosedAt, now: performance.now() }; });
    console.log('SCENE', JSON.stringify(sc));
    console.log('STATE AT FAILURE', JSON.stringify({ room: g.room, panel: u.panel, dialogue: u.dialogue.length, effect: u.effect, prompt: u.prompt, timeline: g.timeline }));
    await snap({ path: `${OUT}/zz-failure.png` });
  } catch {}
} finally {
  const real = errors.filter((e) => !/favicon/.test(e));
  check('no page errors / console errors', real.length === 0, real.slice(0, 5).join(' | '));
  await browser.close();
  server.kill();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} smoke checks passed. Screenshots in ${OUT}`);
  process.exit(failed ? 1 : 0);
}
