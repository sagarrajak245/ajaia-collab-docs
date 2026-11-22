/**
 * Minimal structured JSON logger.
 *
 * One JSON object per line (easy to filter in Vercel logs). Callers pass
 * context such as requestId/userId; never pass secrets or document content.
 */
type Level = "debug" | "info" | "warn" | "error";
const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL as Level) ?? "info";
  return LEVEL_ORDER[lvl] ?? LEVEL_ORDER.info;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < threshold()) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...context });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
};
