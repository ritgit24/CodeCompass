import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelativeTime(iso: string): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `~${mins} min`;
  const hours = mins / 60;
  return hours < 2 ? `~1.5 h` : `~${Math.round(hours)} h`;
}

/** Extract owner/name from a github.com URL (or "owner/name" shorthand). */
export function parseRepoUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const ssh = trimmed.match(/git@github\.com:([\w.-]+)\/([\w.-]+)/i);
  if (ssh) return { owner: ssh[1], name: ssh[2] };
  const https = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (https) return { owner: https[1], name: https[2] };
  const short = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], name: short[2] };
  return null;
}
