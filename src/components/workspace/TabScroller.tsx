"use client";

import { useEffect, useRef } from "react";

export function TabScroller({ children, onOverflowChange }: { children: React.ReactNode; onOverflowChange: (hasOverflow: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function checkOverflow() {
      onOverflowChange(el!.scrollWidth > el!.clientWidth + 1);
    }
    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    function onWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    <div ref={ref} className="tabs-scrollbar-hide flex flex-1 items-end gap-1 overflow-x-auto whitespace-nowrap">
      {children}
    </div>
  );
}
