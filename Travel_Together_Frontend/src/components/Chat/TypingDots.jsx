export default function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="inline-block h-1 w-1 animate-bounce rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
