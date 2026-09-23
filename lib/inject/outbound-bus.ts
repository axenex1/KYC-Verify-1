/**
 * Publishes the Injector desktop-loop MediaStream for Companion outbound.
 * Lab only: one operator browser tab.
 */

type Listener = (stream: MediaStream | null) => void;

let current: MediaStream | null = null;
const listeners = new Set<Listener>();

export function setInjectOutboundStream(stream: MediaStream | null) {
  current = stream;
  for (const listener of listeners) listener(stream);
}

export function getInjectOutboundStream(): MediaStream | null {
  return current;
}

export function subscribeInjectOutbound(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
