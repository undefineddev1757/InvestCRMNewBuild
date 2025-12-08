"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface DropdownContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdownContext() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error("DropdownMenu components must be used within <DropdownMenu>")
  return ctx
}

const DropdownMenu: React.FC<{ children: React.ReactNode }>=({ children })=>{
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const value = useMemo(() => ({ open, setOpen, triggerRef }), [open])
  return (
    <DropdownContext.Provider value={value}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

const DropdownMenuTrigger: React.FC<{ children: React.ReactElement; asChild?: boolean }>=({ children })=>{
  const { setOpen, triggerRef, open } = useDropdownContext() as any
  return React.cloneElement(children as any, {
    ref: triggerRef,
    onClick: (e: any) => {
      (children as any).props?.onClick?.(e)
      setOpen(!open)
    },
  } as any)
}

const DropdownMenuContent: React.FC<{ children: React.ReactNode; align?: "start" | "end"; className?: string }>=({ children, align = "start", className })=>{
  const { open, setOpen } = useDropdownContext()
  const contentRef = useRef<HTMLDivElement>(null)

  const onClickOutside = useCallback((e: MouseEvent) => {
    if (!contentRef.current) return
    if (!(e.target instanceof Node)) return
    if (!contentRef.current.contains(e.target)) setOpen(false)
  }, [setOpen])

  useEffect(()=>{
    if(!open) return
    document.addEventListener("mousedown", onClickOutside)
    const onEsc = (e: KeyboardEvent)=>{ if(e.key === "Escape") setOpen(false) }
    const onScroll = ()=> setOpen(false)
    const onResize = ()=> setOpen(false)
    document.addEventListener("keydown", onEsc)
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)
    return ()=>{ 
      document.removeEventListener("mousedown", onClickOutside); 
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    }
  },[open,onClickOutside,setOpen])

  if(!open) return null
  return (
    <div ref={contentRef} className={cn(
      "absolute z-[9999] w-64 max-h-96 overflow-auto rounded-lg border bg-white dark:bg-neutral-900 p-1 text-foreground shadow-lg",
      align === "end" ? "right-0 mt-2" : "left-0 mt-2",
      className
    )}>
      {children}
    </div>
  )
}

const DropdownMenuItem: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }>=({ children, className, onClick })=>{
  const { setOpen } = useDropdownContext()
  return (
    <button
      className={cn("w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground", className)}
      onClick={()=>{ onClick?.(); setOpen(false) }}
      type="button"
    >
      {children}
    </button>
  )
}

const DropdownMenuSeparator: React.FC<{ className?: string }>=({ className })=>(
  <div className={cn("my-1 h-px bg-muted", className)} />
)

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }


