import type { RoomId } from '../state/types';

export type BusEvents = {
  roomChanged: { room: RoomId; spawn: string };
  focusObject: { objectId: string };
  recordPlay: { kind: 'normal' | 'echo' | 'toaster'; outcome?: number };
  rewind: undefined;
  lever: undefined;
  refresh: undefined;
  shake: { intensity: number };
};

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<any>>>();
  on<K extends keyof BusEvents>(k: K, h: Handler<BusEvents[K]>): () => void {
    if (!this.handlers.has(k)) this.handlers.set(k, new Set());
    this.handlers.get(k)!.add(h);
    return () => this.handlers.get(k)?.delete(h);
  }
  emit<K extends keyof BusEvents>(k: K, payload?: BusEvents[K]) {
    this.handlers.get(k)?.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        console.error(`[bus] handler for ${String(k)} failed`, e);
      }
    });
  }
}

export const bus = new Bus();

/** Shared virtual joystick for on-screen touch controls. */
export const touchInput = { x: 0, y: 0, action: false };
