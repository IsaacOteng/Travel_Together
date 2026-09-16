import { useEffect } from "react";

/* Freezes the page behind an open overlay. Without this, a wheel gesture over
   a panel that isn't tall enough to scroll just scrolls the page underneath,
   and scrolling to the end of a list that does chains through to the page.
   The padding compensation keeps the layout from jumping sideways by the
   width of the scrollbar the moment it's hidden. */
export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement: html } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding  = body.style.paddingRight;
    const scrollBarW   = window.innerWidth - html.clientWidth;

    body.style.overflow = "hidden";
    if (scrollBarW > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollBarW}px`;
    }

    return () => {
      body.style.overflow    = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [active]);
}
