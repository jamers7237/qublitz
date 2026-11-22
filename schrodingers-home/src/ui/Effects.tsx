import { useEffect } from 'react';
import { useSettings, useUI } from '../state/store';
import { clearEffect } from '../state/uiActions';

const DURATION = { rewind: 1300, static: 900, echo: 1600, vaultOpen: 2600 } as const;

export function Effects() {
  const ui = useUI();
  const settings = useSettings();
  const fx = ui.effect;
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(clearEffect, settings.reducedMotion ? 500 : DURATION[fx.kind]);
    return () => clearTimeout(t);
  }, [fx?.id, settings.reducedMotion]); // keyed by id: store clones must not restart the timer
  if (!fx) return null;
  return <div key={fx.id} className={`fx ${fx.kind}`} aria-hidden data-testid={`fx-${fx.kind}`} />;
}
