'use client'

import * as React from 'react'

type ToastItem = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type ToastContextValue = {
  toasts: ToastItem[]
}

export function useToast() {
  return React.useMemo<ToastContextValue>(() => ({ toasts: [] }), [])
}
