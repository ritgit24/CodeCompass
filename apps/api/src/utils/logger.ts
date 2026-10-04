type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: unknown) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] [${level.toUpperCase()}] ${msg}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.log(line, meta ?? "");
}

export const logger = {
  debug: (msg: string, meta?: unknown) => {
    if (process.env.DEBUG) emit("debug", msg, meta);
  },
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
};

/** Strip obvious secrets before persisting/logging agent output. */
export function redactSecrets(input: string): string {
  return input
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, "gh***REDACTED***")
    .replace(/sk-[A-Za-z0-9-]{20,}/g, "sk-***REDACTED***")
    .replace(
      /([A-Za-z0-9_]*(?:API|SECRET|TOKEN|PASSWORD|KEY)[A-Za-z0-9_]*\s*[=:]\s*)("[^"]+"|'[^']+'|\S+)/gi,
      "$1***REDACTED***",
    );
}
