import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "pulse" | "wave" | "shimmer"
}) {
  return (
    <div
      data-slot="skeleton"
      data-variant={variant}
      className={cn(
        "rounded-xl bg-muted/60 overflow-hidden",
        // Default pulse
        variant === "default" && "animate-pulse",
        variant === "pulse" && "animate-pulse bg-muted/80",
        // Wave: shimmer gradient
        (variant === "wave" || variant === "shimmer") && [
          "relative bg-muted/50",
          "before:absolute before:inset-0",
          "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:animate-[shimmer_1.5s_infinite]",
          "dark:before:via-white/8",
        ].join(" "),
        className
      )}
      style={{
        // Inject keyframe if not already in global CSS
        ...(variant === "wave" || variant === "shimmer"
          ? ({
              "--shimmer-duration": "1.5s",
            } as React.CSSProperties)
          : {}),
      }}
      {...props}
    />
  )
}

// Skeleton group for creating structured loading placeholders
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="wave"
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Skeleton
      variant="wave"
      className={cn(
        "rounded-full shrink-0",
        size === "sm" && "size-8",
        size === "default" && "size-10",
        size === "lg" && "size-14",
        className
      )}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 p-5 rounded-2xl border border-border/50 bg-card", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton variant="wave" className="h-4 w-1/3" />
          <Skeleton variant="wave" className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <Skeleton variant="wave" className="h-8 w-1/4 rounded-xl" />
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard }