'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'

type SheetContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet.')
  }
  return context
}

function Sheet({
  open: openProp,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value)
      if (openProp === undefined) {
        setInternalOpen(value)
      }
    },
    [onOpenChange, openProp],
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<'div'> & { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  const { open } = useSheetContext()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div
        className={cn(
          'bg-background fixed z-50 h-full w-80 border p-4 shadow-lg',
          side === 'left' && 'left-0 top-0',
          side === 'right' && 'right-0 top-0',
          side === 'top' && 'left-0 top-0 h-auto w-full',
          side === 'bottom' && 'bottom-0 left-0 h-auto w-full',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4 space-y-1.5', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription }
