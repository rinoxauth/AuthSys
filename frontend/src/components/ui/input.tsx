import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  size: _size,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base layout
        "h-9 w-full min-w-0 rounded-xl",
        "border border-[var(--border)] bg-[var(--glass-bg)]",
        "px-3 py-1.5 text-base",
        "backdrop-blur-xl",
        // Typography
        "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60",
        "md:text-sm",
        // Transition
        "transition-all duration-200 ease-out outline-none",
        // File input
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--foreground)]",
        // Focus
        "focus-visible:border-[var(--primary)]/70 focus-visible:ring-[3px] focus-visible:ring-[var(--primary)]/25",
        "focus-visible:bg-[var(--background)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--muted)]/50 disabled:opacity-50",
        // Invalid
        "aria-invalid:border-[var(--destructive)] aria-invalid:ring-3 aria-invalid:ring-[var(--destructive)]/20",
        // Hover
        "hover:border-[var(--border-hover)] hover:bg-[var(--background)]/80",
        className
      )}
      {...props}
    />
  )
}

// InputWrapper: adds icon support for inputs
function InputWrapper({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-wrapper"
      className={cn("relative flex items-center", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function InputIcon({
  className,
  side = "left",
  ...props
}: React.ComponentProps<"span"> & { side?: "left" | "right" }) {
  return (
    <span
      data-slot="input-icon"
      data-side={side}
      className={cn(
        "pointer-events-none absolute flex items-center justify-center text-[var(--muted-foreground)]/70",
        "transition-colors duration-150 [input:focus~&]:text-[var(--primary)]",
        side === "left" ? "left-3" : "right-3",
        "[&>svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { Input, InputWrapper, InputIcon }