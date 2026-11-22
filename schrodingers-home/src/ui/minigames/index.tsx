import type { MinigameId } from '../../state/types';
import { Calibration } from './Calibration';
import { Cartridge, Gramophone } from './Gramophone';
import { Ledger } from './Ledger';
import { Lantern } from './Lantern';
import { Listening } from './Listening';
import { Mirror } from './Mirror';
import { NotebookMatch } from './NotebookMatch';
import { Switchboard } from './Switchboard';
import { Toaster } from './Toaster';
import { VaultSequencer } from './VaultSequencer';

export function MinigameHost({ id }: { id: MinigameId }) {
  switch (id) {
    case 'notebookMatch': return <NotebookMatch />;
    case 'calibration': return <Calibration />;
    case 'listening': return <Listening />;
    case 'switchboard': return <Switchboard />;
    case 'mirror': return <Mirror />;
    case 'cartridge': return <Cartridge />;
    case 'gramophone': return <Gramophone />;
    case 'ledger': return <Ledger />;
    case 'toaster': return <Toaster />;
    case 'lantern': return <Lantern />;
    case 'vault': return <VaultSequencer />;
  }
}
