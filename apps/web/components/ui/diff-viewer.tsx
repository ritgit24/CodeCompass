"use client";

import * as React from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** Split a unified diff into its "old" and "new" sides. */
export function diffToOldNew(diff: string): { oldValue: string; newValue: string } {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (const line of diff.split("\n")) {
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      continue;
    }
    if (line.startsWith("@@")) continue;
    if (line.startsWith("+")) newLines.push(line.slice(1));
    else if (line.startsWith("-")) oldLines.push(line.slice(1));
    else {
      const value = line.startsWith(" ") ? line.slice(1) : line;
      oldLines.push(value);
      newLines.push(value);
    }
  }
  return { oldValue: oldLines.join("\n"), newValue: newLines.join("\n") };
}

export function DiffViewer({
  diff,
  filename,
  splitView = true,
  className,
}: {
  diff: string;
  filename?: string;
  splitView?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { oldValue, newValue } = React.useMemo(() => diffToOldNew(diff), [diff]);
  const dark = resolvedTheme !== "light";

  return (
    <div className={cn("overflow-auto rounded-xl border border-border bg-elevated", className)}>
      {filename && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="truncate font-mono text-xs text-muted">{filename}</span>
        </div>
      )}
      <div className="min-w-full text-[12.5px]">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={splitView}
          useDarkTheme={dark}
          compareMethod={DiffMethod.LINES}
          hideLineNumbers={false}
          styles={{
            variables: {
              light: { diffViewerBackground: "transparent", diffViewerColor: "#0f172a" },
              dark: { diffViewerBackground: "transparent", diffViewerColor: "#e6eaf2" },
            },
            contentText: { fontFamily: "var(--font-mono), monospace", fontSize: "12.5px" },
          }}
        />
      </div>
    </div>
  );
}
