export default function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-[#FF6B35] inline-block animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
