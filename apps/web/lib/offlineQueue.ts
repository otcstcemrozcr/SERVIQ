export interface QueuedRequest {
  id: string;
  path: string;
  init: RequestInit;
  timestamp: number;
}

const QUEUE_KEY = "serviq_offline_queue";

// Simple pub/sub to notify UI components
type Listener = (queue: QueuedRequest[]) => void;
const listeners = new Set<Listener>();

function notify() {
  const queue = getQueue();
  listeners.forEach(l => l(queue));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(getQueue());
  return () => {
    listeners.delete(listener);
  };
}

export function getQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function enqueueRequest(path: string, init: RequestInit) {
  const queue = getQueue();
  const request: QueuedRequest = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    path,
    init,
    timestamp: Date.now()
  };
  queue.push(request);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notify();
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
  notify();
}

export class OfflineQueuedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfflineQueuedError";
  }
}
