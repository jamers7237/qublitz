import { useEffect, useState } from 'react';
import { touchInput } from '../game/bus';
import { useSettings, useUI } from '../state/store';

export function TouchControls() {
  const settings = useSettings();
  const ui = useUI();
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setCoarse(mq.matches || window.innerWidth < 700);
    const on = () => setCoarse(mq.matches || window.innerWidth < 700);
    mq.addEventListener('change', on);
    window.addEventListener('resize', on);
    return () => {
      mq.removeEventListener('change', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  const show = settings.showTouchControls === 'on' || (settings.showTouchControls === 'auto' && coarse);
  if (!show || ui.panel) return null;
  const hold = (x: number, y: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      touchInput.x = x;
      touchInput.y = y;
    },
    onPointerUp: () => {
      touchInput.x = 0;
      touchInput.y = 0;
    },
    onPointerCancel: () => {
      touchInput.x = 0;
      touchInput.y = 0;
    },
  });
  return (
    <>
      <div className="touch left" aria-label="Movement pad">
        <span />
        <button {...hold(0, -1)} aria-label="Up">▲</button>
        <span />
        <button {...hold(-1, 0)} aria-label="Left">◀</button>
        <span />
        <button {...hold(1, 0)} aria-label="Right">▶</button>
        <span />
        <button {...hold(0, 1)} aria-label="Down">▼</button>
        <span />
      </div>
      <div className="touch right">
        <button onPointerDown={() => (touchInput.action = true)} aria-label="Interact">E</button>
      </div>
    </>
  );
}
