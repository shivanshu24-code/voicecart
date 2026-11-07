const bars = [
  { x: 9, height: 7 },
  { x: 13, height: 11 },
  { x: 17, height: 9 },
  { x: 21, height: 5 },
];

/** A shopping bag whose body is a sound wave: voice and shop in one mark. */
export function LogoMark({ size = 32, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#2f4a3f" />
      <path d="M11.5 11V9.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="#f7f5f0" strokeWidth="1.8" strokeLinecap="round" />
      {bars.map(({ x, height }, index) => (
        <rect
          key={x}
          x={x}
          y={19.5 - height / 2}
          width="2.2"
          height={height}
          rx="1.1"
          fill="#e7c873"
          className={animated ? "logo-bar" : undefined}
          style={animated ? { animationDelay: `${index * -0.3}s` } : undefined}
        />
      ))}
    </svg>
  );
}

export function Logo({ size = 32, animated = false, className = "" }: { size?: number; animated?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-xl ${className}`}>
      <LogoMark size={size} animated={animated} />
      VoiceCart
    </span>
  );
}
