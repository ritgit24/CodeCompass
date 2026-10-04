import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-elevated text-foreground",
        primary: "border-transparent bg-[var(--primary)]/15 text-[var(--primary-2)]",
        success: "border-transparent bg-[var(--success)]/15 text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning)]/15 text-[var(--warning)]",
        danger: "border-transparent bg-[var(--danger)]/15 text-[var(--danger)]",
        violet: "border-transparent bg-[var(--violet)]/15 text-[var(--violet)]",
        muted: "border-border bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
