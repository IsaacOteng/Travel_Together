import { useState, useRef, useEffect } from "react";
import { Send, ImageIcon, Loader } from "lucide-react";

export default function InputBar({ onSend, onSendImage, uploading }) {
  const [val,    setVal]    = useState("");
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [val]);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendImage(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-end gap-2 px-3 py-3 bg-[#0d1b2a] border-t border-white/[0.06] flex-shrink-0">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-white/[0.1] transition-colors disabled:opacity-40 border border-white/[0.08]"
        title="Send image"
      >
        {uploading
          ? <Loader size={14} className="text-white/40 animate-spin" />
          : <ImageIcon size={15} className="text-white/45" />
        }
      </button>

      <textarea
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl py-2.5 px-4 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#FF6B35]/30 transition-colors resize-none leading-relaxed"
        style={{ minHeight: 42, overflowY: "hidden" }}
      />
      <button
        onClick={send}
        disabled={!val.trim()}
        className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#e55c28] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ marginBottom: 1 }}
      >
        <Send size={15} className="text-white" />
      </button>
    </div>
  );
}
