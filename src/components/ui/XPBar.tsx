interface XPBarProps {
  current: number;
  required: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export function XPBar({ current, required, color, height = 8, showLabel = false, animated = true }: XPBarProps) {
  const pct = Math.min(100, required > 0 ? Math.floor((current / required) * 100) : 0);

  return (
    <div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          <span>{current.toLocaleString()} XP</span>
          <span>{required.toLocaleString()} XP</span>
        </div>
      )}
      <div style={{
        height, borderRadius: height, background: '#1e2d4a', overflow: 'hidden',
      }}>
        <div
          className={animated ? 'xp-bar-fill' : ''}
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: height,
            background: animated ? undefined : (color || 'linear-gradient(90deg, #7c3aed, #06b6d4)'),
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            minWidth: pct > 0 ? 4 : 0,
          }}
        />
      </div>
    </div>
  );
}
