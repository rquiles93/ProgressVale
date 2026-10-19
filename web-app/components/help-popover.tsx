"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function HelpPopover({ label, children, className = "", align = "left" }: { label: string; children: ReactNode; className?: string; align?: "left" | "right" }) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setHovered(false);
        setPinned(false);
      }
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHovered(false);
        setPinned(false);
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [open]);

  return <span ref={rootRef} className="relative inline-flex" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}><button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setPinned((value) => !value)} className="focus-ring grid size-6 place-items-center rounded-full bg-rust-soft text-rust-dark"><CircleHelp size={14} /></button>{open && <span id={id} role="tooltip" className={`absolute top-[calc(100%+0.5rem)] z-30 block rounded-2xl border border-rust/20 bg-paper p-4 text-left shadow-soft ${align === "right" ? "right-0" : "left-0"} ${className}`}>{children}</span>}</span>;
}
