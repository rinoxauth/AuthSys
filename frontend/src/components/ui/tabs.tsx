"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  [
    "group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground",
    "group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
    "data-[variant=line]:rounded-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-muted/70 rounded-xl p-1 shadow-sm backdrop-blur-sm",
        line: "gap-1 bg-transparent",
        pills: "gap-1 bg-transparent",
        underline: "gap-0 bg-transparent border-b border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Base
        "relative inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5",
        "rounded-lg border border-transparent px-3 py-1",
        "text-sm font-medium whitespace-nowrap",
        "text-muted-foreground/70",
        // Layout
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        // Hover
        "hover:text-foreground",
        "transition-all duration-200 ease-out",
        // Focus
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
        // Icon
        "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Dark
        "dark:text-muted-foreground dark:hover:text-foreground",

        // ── Default variant (bg pill) active ──
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-md",
        "group-data-[variant=default]/tabs-list:data-active:shadow-black/8",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-input/40",
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30",

        // ── Line/pills variant ──
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "group-data-[variant=pills]/tabs-list:data-active:bg-primary/10",
        "group-data-[variant=pills]/tabs-list:data-active:text-primary",
        "group-data-[variant=pills]/tabs-list:data-active:border-primary/20",

        // ── Underline active indicator ──
        "after:absolute after:bg-primary after:opacity-0 after:transition-all after:duration-200",
        "group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-[-4px] group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:rounded-full",
        "group-data-vertical/tabs:after:inset-y-2 group-data-vertical/tabs:after:-right-[3px] group-data-vertical/tabs:after:w-0.5 group-data-vertical/tabs:after:rounded-full",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        "group-data-[variant=underline]/tabs-list:data-active:after:opacity-100",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none",
        "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-1",
        "duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }