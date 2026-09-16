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
    <div className="flex shrink-0 items-end gap-2 border-t border-line bg-ground px-3 py-3">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        title="Send image"
      >
        {uploading
          ? <Loader size={15} className="animate-spin" />
          : <ImageIcon size={16} />
        }
      </button>

      <textarea
        ref={inputRef}
        aria-label="Message"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
        style={{ minHeight: 42, overflowY: "hidden" }}
      />
      <button
        onClick={send}
        disabled={!val.trim()}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line"
        style={{ marginBottom: 1 }}
      >
        <Send size={16} className="text-accent-ink" />
      </button>
    </div>
  );
}
