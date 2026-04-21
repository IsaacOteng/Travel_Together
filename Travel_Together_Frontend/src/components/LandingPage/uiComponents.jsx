import { useState, useEffect } from "react";
import { useInView } from "./hooks.js";

export function AnimatedCounter({ target, suffix = "", isDecimal = false }) {
  const [ref, inView] = useInView(0.4);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const dur = 1800;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(isDecimal ? +(eased * target).toFixed(1) : Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, isDecimal]);
  return (
    <span ref={ref}>
      {isDecimal ? val.toFixed(1) : val.toLocaleString()}{suffix}
    </span>
  );
}

export function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s`,
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(28px)",
      }}
    >
      {children}
    </div>
  );
}

export function Avatar({ name, color, size = "w-10 h-10" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}
      style={{ background: color }}>
      {initials}
    </div>
  );
}
