import { useEffect, useRef, useState } from 'react';
import { advanceDialogue } from '../game/dialogueFlow';
import { audio } from '../sound/audioEngine';
import { useSettings, useUI } from '../state/store';
import { Portrait } from './common';

const SPEED = { slow: 42, normal: 24, fast: 10, instant: 0 } as const;

/** Bottom-screen retro dialogue box with typewriter text, blips, skip and choices. */
export function Dialogue() {
  const ui = useUI();
  const settings = useSettings();
  const line = ui.dialogue[0];
  const [shown, setShown] = useState(0);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const text = line?.text ?? '';
  const done = shown >= text.length;

  const lineKey = line ? `${line.id}|${text}` : '';
  useEffect(() => {
    setShown(SPEED[settings.textSpeed] === 0 ? text.length : 0);
  }, [lineKey, settings.textSpeed]); // stable key: store clones must not restart the typewriter

  useEffect(() => {
    if (!line || done) return;
    const ms = SPEED[settings.textSpeed];
    const t = setTimeout(() => {
      setShown((n) => Math.min(text.length, n + 1));
      if (shown % 2 === 0 && text[shown] !== ' ') audio.sfx('blip');
    }, ms);
    return () => clearTimeout(t);
  }, [lineKey, shown, done, settings.textSpeed]);

  useEffect(() => {
    if (done && line?.choices) firstChoice.current?.focus();
  }, [done, lineKey]);

  const proceed = () => {
    if (!line) return;
    if (!done) return setShown(text.length);
    if (line.choices?.length) return;
    advanceDialogue();
  };

  useEffect(() => {
    if (!line) return;
    const onKey = (e: KeyboardEvent) => {
      if (['e', 'E', ' ', 'Enter', 'z', 'Z', 'x', 'X', 'Shift'].includes(e.key)) {
        if ((e.key === 'Enter' || e.key === ' ') && (document.activeElement as HTMLElement)?.tagName === 'BUTTON' && line.choices) return;
        e.preventDefault();
        e.stopPropagation();
        proceed();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!line) return null;
  return (
    <div className="dialogue-wrap">
      <div className="dialogue panel" onClick={proceed} role="dialog" aria-live="polite" aria-label={line.speaker ?? 'Narration'} data-testid="dialogue">
        {line.portrait && (
          <div className="portrait">
            <Portrait id={line.portrait} />
          </div>
        )}
        <div className="grow">
          {line.speaker && (
            <div className="speaker" style={{ color: line.color ?? 'var(--c-gold)' }}>
              {line.speaker}
            </div>
          )}
          <div className="text">{text.slice(0, shown)}</div>
          {done && line.choices && (
            <div className="choices">
              {line.choices.map((c, i) => (
                <button key={c.id} ref={i === 0 ? firstChoice : undefined} className="btn" onClick={(e) => { e.stopPropagation(); advanceDialogue(c.id); }}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {done && !line.choices && <div className="next">▼ E</div>}
      </div>
    </div>
  );
}
