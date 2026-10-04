import type { AnalysisEvent, FixStreamEvent } from "@codecompass/shared";

type Event = AnalysisEvent | FixStreamEvent | Record<string, unknown>;
type Listener = (event: Event) => void;

interface Channel {
  listeners: Set<Listener>;
  history: Event[];
}

/**
 * Tiny in-process pub/sub used to fan out analysis + fix progress over SSE.
 * Keeps a short history so a client that (re)connects mid-stream still catches up.
 */
class EventBus {
  private channels = new Map<string, Channel>();

  private channel(name: string): Channel {
    let ch = this.channels.get(name);
    if (!ch) {
      ch = { listeners: new Set(), history: [] };
      this.channels.set(name, ch);
    }
    return ch;
  }

  publish(name: string, event: Event): void {
    const ch = this.channel(name);
    ch.history.push(event);
    if (ch.history.length > 200) ch.history.shift();
    for (const listener of ch.listeners) {
      try {
        listener(event);
      } catch {
        /* a bad listener must not break the stream */
      }
    }
  }

  subscribe(name: string, listener: Listener): () => void {
    const ch = this.channel(name);
    ch.listeners.add(listener);
    return () => ch.listeners.delete(listener);
  }

  history(name: string): Event[] {
    return [...this.channel(name).history];
  }

  reset(name: string): void {
    this.channels.set(name, { listeners: new Set(), history: [] });
  }
}

export const bus = new EventBus();
export const repoChannel = (repoId: string) => `repo:${repoId}`;
export const fixChannel = (sessionId: string) => `fix:${sessionId}`;
