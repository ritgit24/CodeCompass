"use client";

import Link from "next/link";
import { Compass, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-[var(--primary-foreground)]">
            <Compass className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="text-sm font-semibold tracking-[-0.01em]">CodeCompass</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/#how-it-works"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="/#demo"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Demo
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" asChild>
            <Link href="/#demo">Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
