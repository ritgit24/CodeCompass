import type { AgentEvent } from "@codecompass/shared";

/**
 * Bridges callback-style event emitters (like the Cline SDK's subscribe) into
 * an AsyncIterable that the rest of the app can consume with `for await`.
 */
export function eventBridge() {
  const queue: AgentEvent[] = [];
  let resolveNext: ((v: IteratorResult<AgentEvent>) => void) | null = null;
  let closed = false;

  function push(event: AgentEvent) {
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: event, done: false });
    } else {
      queue.push(event);
    }
  }

  function close() {
    closed = true;
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: undefined as unknown as AgentEvent, done: true });
    }
  }

  const iterable: AsyncIterable<AgentEvent> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<AgentEvent>> {
          const head = queue.shift();
          if (head !== undefined) return Promise.resolve({ value: head, done: false });
          if (closed)
            return Promise.resolve({ value: undefined as unknown as AgentEvent, done: true });
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
      };
    },
  };

  return { push, close, iterable };
}
