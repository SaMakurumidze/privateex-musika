'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'

function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, props)
  }

  return <button {...props}>{children}</button>
}

function TooltipContent({
  className,
  hidden,
  ...props
}: React.ComponentProps<'div'> & { side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end' }) {
  if (hidden) return null
  return (
    <div
      className={cn(
        'bg-popover text-popover-foreground z-50 rounded-md border px-3 py-1.5 text-sm shadow-md',
        className,
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
