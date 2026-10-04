"use client";

import { AlertCircle, Check, Eye, FileCode2, Terminal } from "lucide-react";
import type { AgentEvent } from "@codecompass/shared";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: typeof Eye; tone: string }> = {
  file_read: { icon: Eye, tone: "text-muted" },
  file_edit: { icon: FileCode2, tone: "text-[var(--success)]" },
  command_run: { icon: Terminal, tone: "text-[var(--violet)]" },
  message: { icon: Check, tone: "text-[var(--primary-2)]" },
  error: { icon: AlertCircle, tone: "text-[var(--danger)]" },
};

export function describeEvent(event: AgentEvent): string {
  switch (event.type) {
    case "file_read":
      return `Read ${event.path}`;
    case "file_edit":
      return `Edited ${event.path} (+${event.additions} / -${event.deletions})`;
    case "command_run":
      return `Ran ${event.command}`;
    case "message":
      return event.text;
    case "plan_step":
      return `Step: ${event.step}`;
    case "error":
      return `Error: ${event.message}`;
    default:
      return "";
  }
}

export function ActivityLog({ events }: { events: AgentEvent[] }) {
  const visible = events.filter((e) => e.type !== "text_delta" && e.type !== "done");
  return (
    <div className="max-h-72 space-y-1 overflow-auto rounded-xl border border-border bg-elevated/50 p-3 font-mono text-xs">
      {visible.length === 0 && <p className="text-muted">Waiting for agent activity…</p>}
      {visible.map((event, i) => {
        const meta = ICONS[event.type] ?? { icon: Check, tone: "text-muted" };
        const Icon = meta.icon;
        return (
          <div key={i} className="flex items-start gap-2 animate-fade-in">
            <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.tone)} />
            <span className="min-w-0 flex-1 break-words text-muted">{describeEvent(event)}</span>
          </div>
        );
      })}
    </div>
  );
}
