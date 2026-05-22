interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

const SIZE = {
  sm: { w: 28, h: 28, font: 11 },
  md: { w: 36, h: 36, font: 13 },
  lg: { w: 52, h: 52, font: 18 },
};

export function LevelBadge({ level, size = 'md', glow = false }: LevelBadgeProps) {
  const s = SIZE[size];
  const color = level >= 10 ? '#eab308' : level >= 5 ? '#a855f7' : '#06b6d4';
  return (
    <div
      className={glow ? 'badge-gold' : ''}
      style={{
        width: s.w, height: s.h,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}40, ${color}20)`,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: s.font,
        color, flexShrink: 0,
        boxShadow: glow ? `0 0 12px ${color}60` : `0 0 6px ${color}30`,
      }}
    >
      {level}
    </div>
  );
}
