export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="SOUL is thinking">
      <div className="flex h-8 items-center gap-1.5 px-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="soul-dot block h-1.5 w-1.5 rounded-full bg-gradient-to-b from-lilac to-soul"
            style={{ animationDelay: `${i * 0.14}s` }}
          />
        ))}
      </div>
      <span className="text-xs tracking-[0.2em] uppercase text-lilac/60 font-display">Thinking</span>
    </div>
  );
}
