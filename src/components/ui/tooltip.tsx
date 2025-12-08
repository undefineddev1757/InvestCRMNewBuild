"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block group">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const context = React.useContext(TooltipContext)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref,
      onMouseEnter: () => context?.setOpen(true),
      onMouseLeave: () => context?.setOpen(false),
    } as any)
  }
  
  return (
    <div
      ref={ref}
      onMouseEnter={() => context?.setOpen(true)}
      onMouseLeave={() => context?.setOpen(false)}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TooltipContext)
  
  if (!context?.open) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2",
        "bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2",
        "text-xs whitespace-nowrap pointer-events-none",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      {...props}
    >
      {children}
      {/* Стрелка */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
        <div className="border-4 border-transparent border-t-popover" />
      </div>
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
