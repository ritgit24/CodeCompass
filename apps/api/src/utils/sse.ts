import type { Response } from "express";

/** Prepare a response for Server-Sent Events. */
export function openSse(res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

export function sendSse(res: Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function closeSse(res: Response) {
  res.write("data: [DONE]\n\n");
  res.end();
}
