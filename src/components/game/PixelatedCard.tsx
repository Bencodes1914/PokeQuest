import { cn } from "@/lib/utils";
import React from "react";

interface PixelatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PixelatedCard = React.forwardRef<HTMLDivElement, PixelatedCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border-4 border-foreground bg-card text-card-foreground shadow-[8px_8px_0px_hsl(var(--foreground))]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PixelatedCard.displayName = "PixelatedCard";
