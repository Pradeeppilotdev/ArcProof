import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        settled: "rounded-full text-[10px] font-medium px-2.5 py-1 text-[#818cf8] bg-[#818cf8]/10 border-[#818cf8]/30",
        proving: "rounded-full text-[10px] font-medium px-2.5 py-1 text-[#e8799a] bg-[#e8799a]/10 border-[#e8799a]/30",
        slashed: "rounded-full text-[10px] font-medium px-2.5 py-1 text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
