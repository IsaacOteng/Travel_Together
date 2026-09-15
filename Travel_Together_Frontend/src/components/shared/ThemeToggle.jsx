import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

/* `overlay` styles the control for sitting on a photograph, where the
   cream-on-ink palette would disappear. */
export default function ThemeToggle({ overlay = false, className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const skin = overlay
    ? "border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
    : "border-line bg-surface text-ink-mute hover:border-accent/40 hover:text-accent";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors ${skin} ${className}`}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
