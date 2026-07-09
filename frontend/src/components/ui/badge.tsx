import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1",
    "overflow-hidden rounded-full border border-transparent",
    "px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap",
    "transition-all duration-200 ease-out",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20",
          "hover:bg-primary hover:shadow-primary/30",
          "[a]:hover:bg-primary/80",
        ].join(" "),
        secondary: [
          "bg-secondary/80 text-secondary-foreground shadow-sm",
          "hover:bg-secondary",
          "[a]:hover:bg-secondary/80",
        ].join(" "),
        destructive: [
          "bg-destructive/10 text-destructive border-destructive/20",
          "focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40",
          "hover:bg-destructive/20 [a]:hover:bg-destructive/20",
        ].join(" "),
        outline: [
          "border-border/70 text-foreground bg-background/50 backdrop-blur-sm",
          "hover:bg-muted/80 hover:border-border",
          "[a]:hover:bg-muted [a]:hover:text-muted-foreground",
          "shadow-sm",
        ].join(" "),
        ghost: [
          "bg-transparent text-muted-foreground",
          "hover:bg-muted/70 hover:text-foreground",
          "dark:hover:bg-muted/40",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
        success: [
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          "hover:bg-emerald-500/20 dark:text-emerald-400",
          "shadow-sm shadow-emerald-500/10",
        ].join(" "),
        warning: [
          "bg-amber-500/10 text-amber-600 border-amber-500/20",
          "hover:bg-amber-500/20 dark:text-amber-400",
          "shadow-sm shadow-amber-500/10",
        ].join(" "),
        info: [
          "bg-blue-500/10 text-blue-600 border-blue-500/20",
          "hover:bg-blue-500/20 dark:text-blue-400",
          "shadow-sm shadow-blue-500/10",
        ].join(" "),
      },
      size: {
        default: "h-5 px-2.5 text-xs",
        sm: "h-4 px-2 text-[10px]",
        lg: "h-6 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }