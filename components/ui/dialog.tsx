"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

export function Dialog({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}

export function DialogTrigger({ ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} />
}

export function DialogContent({
  className,
  showCloseButton,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-6 shadow-lg",
        className
      )}
      {...props}
    >
      {/* Keep prop parity with callers while using a minimal dialog implementation. */}
      {showCloseButton ? (
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          x
        </button>
      ) : null}
    </div>
  )
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}