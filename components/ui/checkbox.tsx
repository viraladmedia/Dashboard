// File: components/ui/checkbox.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-slate-300",
          "text-slate-900 focus:ring-2 focus:ring-slate-400 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        checked={!!checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";
