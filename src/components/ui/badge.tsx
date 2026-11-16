import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary dark:text-blue-300",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-muted-foreground bg-card",
        success: "border-transparent bg-success/12 text-emerald-700 dark:text-emerald-300",
        warning: "border-transparent bg-warning/15 text-amber-700 dark:text-amber-300",
        danger: "border-transparent bg-danger/10 text-rose-700 dark:text-rose-300",
        lavender: "border-transparent bg-lavender/12 text-violet-700 dark:text-violet-300",
        navy: "border-transparent bg-navy text-white dark:bg-white dark:text-navy",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
