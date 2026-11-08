"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Closes the <details> menu after navigation or on Escape. The menu itself works without this. */
export function MenuCloser({ id }: { id: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const menu = document.getElementById(id) as HTMLDetailsElement | null;
    if (!menu) return;
    menu.open = false;
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a")) menu.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    menu.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      menu.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [id, pathname]);
  return null;
}
