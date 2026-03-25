'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'

function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function ToastViewport({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('fixed right-0 bottom-0 z-50 flex max-w-sm flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function Toast({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('bg-background rounded-md border p-4 shadow-md', className)}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-sm font-semibold', className)} {...props} />
}

function ToastDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />
}

function ToastClose({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label="Close"
      className={cn('absolute top-2 right-2 text-xs opacity-60 hover:opacity-100', className)}
      {...props}
    >
      x
    </button>
  )
}

export { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport }
