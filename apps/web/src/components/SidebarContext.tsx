'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface SidebarContext {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const Ctx = createContext<SidebarContext | null>(null);

export function useSidebar(): SidebarContext {
  return (
    useContext(Ctx) ?? {
      open: false,
      toggle: () => {},
      close: () => {},
    }
  );
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return <Ctx.Provider value={{ open, toggle, close }}>{children}</Ctx.Provider>;
}
