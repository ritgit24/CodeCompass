"use client";

import { ArrowDownLeft, ArrowUpRight, Files, MessageSquareCode, ZoomIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ModelNode } from "@/lib/graph-model";

export interface NeighbourRef {
  id: string;
  label: string;
}

export function MapDrawer({
  node,
  imports,
  importedBy,
  onOpenFile,
  onAsk,
  onDrillDown,
  onSelect,
  onClose,
}: {
  node: ModelNode | null;
  imports: NeighbourRef[];
  importedBy: NeighbourRef[];
  onOpenFile: (path: string) => void;
  onAsk: (question: string) => void;
  onDrillDown: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const canDrill = Boolean(node && node.id !== "." && node.fileCount > 1);

  return (
    <Sheet open={Boolean(node)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title={node?.label ?? "Module"}>
        {node && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-xs text-muted">{node.id === "." ? "(root)" : node.id}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="primary">{node.language}</Badge>
                <Badge variant="muted">{node.fileCount} files</Badge>
                <Badge variant="muted">{node.group}</Badge>
                <Badge variant="muted">↓{node.inDegree} imports in</Badge>
                <Badge variant="muted">↑{node.outDegree} imports out</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={imports.length === 0}
                onClick={() => imports[0] && onSelect(imports[0].id)}
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> Depends on {imports.length}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={importedBy.length === 0}
                onClick={() => importedBy[0] && onSelect(importedBy[0].id)}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" /> Used by {importedBy.length}
              </Button>
            </div>

            {imports.length > 0 && (
              <DependencyList
                title="Imports (depends on)"
                items={imports}
                onSelect={onSelect}
                icon={<ArrowUpRight className="h-3 w-3 text-muted" />}
              />
            )}
            {importedBy.length > 0 && (
              <DependencyList
                title="Imported by"
                items={importedBy}
                onSelect={onSelect}
                icon={<ArrowDownLeft className="h-3 w-3 text-muted" />}
              />
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Files inside
              </p>
              <ul className="space-y-1">
                {node.files.slice(0, 60).map((file) => (
                  <li key={file}>
                    <button
                      onClick={() => onOpenFile(file)}
                      className="flex w-full items-center gap-1.5 truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted transition-colors hover:bg-elevated hover:text-foreground"
                    >
                      <Files className="h-3 w-3 shrink-0" />
                      <span className="truncate">{file}</span>
                    </button>
                  </li>
                ))}
                {node.files.length > 60 && (
                  <li className="px-2 pt-1 text-[11px] text-muted">
                    +{node.files.length - 60} more files
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  onAsk(`Explain the "${node.label}" module and how it fits into the project.`);
                  onClose();
                }}
              >
                <MessageSquareCode className="h-4 w-4" /> Ask about this
              </Button>
              {canDrill && (
                <Button variant="secondary" onClick={() => onDrillDown(node.id)}>
                  <ZoomIn className="h-4 w-4" /> Break this module down
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DependencyList({
  title,
  items,
  onSelect,
  icon,
}: {
  title: string;
  items: NeighbourRef[];
  onSelect: (id: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-[var(--primary-2)]/50 hover:text-foreground"
            >
              {icon}
              {item.label}
            </button>
          </li>
        ))}
        {items.length > 12 && (
          <li className="self-center text-[11px] text-muted">+{items.length - 12} more</li>
        )}
      </ul>
    </div>
  );
}
