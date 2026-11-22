import { useEffect } from 'react';
import { P } from '../game/progression';
import { audio } from '../sound/audioEngine';
import { installAutosave, loadSettings } from '../state/persistence';
import { gameStore, settingsStore, uiStore, useSettings, useUI } from '../state/store';
import { closePanel, openPanel } from '../state/uiActions';
import { existingAssetUrl, loadReport } from '../game/scenes/BootScene';
import { correctScore } from '../quantum/model';
import { interact, pullLever } from '../game/interactions';
import { advanceDialogue } from '../game/dialogueFlow';
import * as puzzles from '../game/puzzles';
import * as session from '../game/session';
import { assetById } from '../assets/manifest';
import { DebugPanel } from './DebugPanel';
import { Dialogue } from './Dialogue';
import { Effects } from './Effects';
import { Ending, Credits } from './Ending';
import { GameCanvas } from './GameCanvas';
import { HintPanel } from './HintPanel';
import { Hud } from './Hud';
import { Inventory } from './Inventory';
import { MinigameHost } from './minigames';
import { Notebook } from './Notebook';
import { PhotoModal } from './PhotoModal';
import { Settings } from './Settings';
import { NameEntry, TitleScreen } from './TitleScreen';
import { TouchControls } from './TouchControls';

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  settingsStore.set(loadSettings());
  audio.applySettings(settingsStore.get());
  settingsStore.subscribe(() => audio.applySettings(settingsStore.get()));
  const params = new URLSearchParams(location.search);
  if (params.get('debug') === '1' || import.meta.env.VITE_DEBUG === '1') uiStore.update((u) => void (u.debug = true));
  audio.ambientUrl = existingAssetUrl(assetById('audio.ambient')?.url);
  installAutosave();
  // Test/debug hooks (dev server or ?debug=1 only) so automated smoke tests can assert real state.
  if (import.meta.env.DEV || uiStore.get().debug) {
    (window as any).__sh = { gameStore, uiStore, settingsStore, loadReport, correctScore, interact, pullLever, advanceDialogue, puzzles, session };
  }
  // play-time accounting (only while in game and not paused in settings)
  setInterval(() => {
    const u = uiStore.get();
    if (u.screen === 'game' && u.panel !== 'settings' && document.visibilityState === 'visible') gameStore.update((g) => void (g.playMs += 1000));
  }, 1000);
}

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export function App() {
  boot();
  const ui = useUI();
  const settings = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const u = uiStore.get();
      if (u.screen !== 'game') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (u.heldItem) return uiStore.update((x) => void (x.heldItem = null));
        if (u.panel) return closePanel();
        if (u.dialogue.length) return;
        return openPanel('settings');
      }
      if (isTyping(e) || u.dialogue.length) return;
      const k = e.key.toLowerCase();
      const toggle = (p: 'notebook' | 'inventory' | 'hints') => (u.panel === p ? closePanel() : !u.panel || typeof u.panel === 'string' ? openPanel(p) : undefined);
      if (k === 'n' && P.notebook(gameStore.get())) toggle('notebook');
      else if (k === 'i') toggle('inventory');
      else if (k === 'h') toggle('hints');
      else if (k === '`' && u.debug) uiStore.update((x) => void (x.debugHitboxes = !x.debugHitboxes));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('reduced', settings.reducedMotion);
  }, [settings.reducedMotion]);

  const panel = ui.panel;
  return (
    <div className="app">
      {ui.screen === 'title' && <TitleScreen />}
      {ui.screen === 'name' && <NameEntry />}
      {ui.screen === 'ending' && <Ending />}
      {ui.screen === 'credits' && <Credits />}
      {ui.screen === 'game' && (
        <>
          <GameCanvas />
          <Hud />
          <TouchControls />
          {panel === 'notebook' && <Notebook />}
          {panel === 'inventory' && <Inventory />}
          {panel === 'hints' && <HintPanel />}
          {(panel === 'settings' || panel === 'help') && <Settings />}
          {panel && typeof panel === 'object' && panel.kind === 'photo' && <PhotoModal id={panel.id} />}
          {panel && typeof panel === 'object' && panel.kind === 'minigame' && <MinigameHost id={panel.id} />}
          <Dialogue />
          <Effects />
        </>
      )}
      {ui.screen !== 'game' && ui.screen !== 'title' && <Dialogue />}
      {ui.debug && <DebugPanel />}
    </div>
  );
}
