import { useState } from "react";
import {
  AlertCircle, Image, MapPin, Navigation, Calendar, Clock,
  Users, Plus, X, Check, ChevronRight, Send, Ticket, Info,
} from "lucide-react";

/* ─── PROGRESS BAR ───────────────────────── */
export function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-7">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold tracking-[.12em] uppercase text-[#FF6B35]">
          Step {step} of {total}
        </span>
        <span className="text-[10px] text-white/30">{pct}%</span>
      </div>
      <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ff9a5c] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── SECTION HEADING ────────────────────── */
export function SectionHead({ icon, title, sub }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-[30px] h-[30px] rounded-[8px] bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center text-[15px] flex-shrink-0">
          {icon}
        </div>
        <h2 className="font-serif text-xl font-light text-white tracking-[-0.3px] m-0">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-[11px] text-white/35 leading-snug ml-[38px] mt-1">{sub}</p>
      )}
    </div>
  );
}

/* ─── LABEL ──────────────────────────────── */
export function Label({ children, required }) {
  return (
    <label className="block text-[10px] font-bold tracking-[.1em] uppercase text-white/35 mb-[7px]">
      {children}
      {required && <span className="text-[#FF6B35] ml-0.5">*</span>}
    </label>
  );
}

/* ─── INPUT ──────────────────────────────── */
export function TTInput({ value, onChange, placeholder, type = "text", className = "" }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`w-full rounded-[10px] px-3 py-[10px] text-[13.5px] text-white
        bg-white/[0.06] font-sans outline-none transition-all duration-150
        placeholder:text-white/25
        ${focused
          ? "border-[1.5px] border-[#FF6B35] shadow-[0_0_0_3px_rgba(255,107,53,0.12)]"
          : "border-[1.5px] border-white/10"
        } ${className}`}
    />
  );
}

/* ─── TEXTAREA ───────────────────────────── */
export function TTTextarea({ value, onChange, placeholder, rows = 3, maxLength = 300 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded-[10px] px-3 py-[10px] text-[13.5px] text-white
          bg-white/[0.06] font-sans outline-none resize-none leading-[1.55]
          placeholder:text-white/25 transition-all duration-150
          ${focused
            ? "border-[1.5px] border-[#FF6B35] shadow-[0_0_0_3px_rgba(255,107,53,0.12)]"
            : "border-[1.5px] border-white/10"
          }`}
      />
      <span className={`absolute bottom-2 right-2.5 text-[10px] pointer-events-none
        ${value.length >= maxLength * 0.9 ? "text-orange-400" : "text-white/20"}`}>
        {value.length}/{maxLength}
      </span>
    </div>
  );
}

/* ─── SELECT ─────────────────────────────── */
export function TTSelect({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`w-full rounded-[10px] px-3 py-[10px] text-[13.5px] font-sans
        bg-white/[0.06] outline-none cursor-pointer appearance-none
        transition-all duration-150
        ${value ? "text-white" : "text-white/35"}
        ${focused ? "border-[1.5px] border-[#FF6B35]" : "border-[1.5px] border-white/10"}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 32,
      }}
    >
      {children}
    </select>
  );
}

/* ─── ERR ────────────────────────────────── */
export function Err({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1.5 mt-[5px] text-[11px] text-red-400">
      <AlertCircle size={11} /> {msg}
    </div>
  );
}

/* ─── PRIMARY BTN ────────────────────────── */
export function PrimaryBtn({ onClick, disabled, children, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3 rounded-xl text-[13.5px] font-bold transition-all duration-150
        flex items-center justify-center gap-2
        ${disabled || loading
          ? "bg-white/[0.07] text-white/30 cursor-not-allowed"
          : "bg-gradient-to-br from-[#FF6B35] to-[#ff7c42] text-white cursor-pointer shadow-[0_4px_14px_rgba(255,107,53,0.30)] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(255,107,53,0.36)]"
        }`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Publishing…
        </>
      ) : children}
    </button>
  );
}

/* ─── GHOST BTN ──────────────────────────── */
export function GhostBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-3 rounded-xl border-[1.5px] border-white/10 bg-transparent
        text-white/50 text-[13.5px] font-medium cursor-pointer
        hover:border-white/20 hover:text-white/70 transition-all duration-150"
    >
      {children}
    </button>
  );
}