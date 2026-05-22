import { useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { xpForMuscleLevel } from '../services/levelCalculator';
import { RotateCcw } from 'lucide-react';

interface Region {
  muscleId: string;
  cx: number; cy: number; rx: number; ry: number;
}

interface TooltipState {
  muscleId: string;
  x: number;
  y: number;
}

// Muscle overlay regions — front view
const FRONT_REGIONS: Region[] = [
  { muscleId: 'ombros',     cx: 44,  cy: 93,  rx: 18, ry: 14 },
  { muscleId: 'ombros',     cx: 156, cy: 93,  rx: 18, ry: 14 },
  { muscleId: 'peito',      cx: 100, cy: 122, rx: 34, ry: 24 },
  { muscleId: 'biceps',     cx: 28,  cy: 145, rx: 11, ry: 21 },
  { muscleId: 'biceps',     cx: 172, cy: 145, rx: 11, ry: 21 },
  { muscleId: 'antebraco',  cx: 21,  cy: 187, rx: 9,  ry: 20 },
  { muscleId: 'antebraco',  cx: 179, cy: 187, rx: 9,  ry: 20 },
  { muscleId: 'abdomen',    cx: 100, cy: 175, rx: 23, ry: 26 },
  { muscleId: 'quadriceps', cx: 75,  cy: 284, rx: 20, ry: 36 },
  { muscleId: 'quadriceps', cx: 125, cy: 284, rx: 20, ry: 36 },
  { muscleId: 'panturrilha',cx: 73,  cy: 365, rx: 14, ry: 27 },
  { muscleId: 'panturrilha',cx: 127, cy: 365, rx: 14, ry: 27 },
];

// Muscle overlay regions — back view
const BACK_REGIONS: Region[] = [
  { muscleId: 'trapezio',    cx: 100, cy: 90,  rx: 30, ry: 18 },
  { muscleId: 'costas',      cx: 71,  cy: 148, rx: 25, ry: 34 },
  { muscleId: 'costas',      cx: 129, cy: 148, rx: 25, ry: 34 },
  { muscleId: 'triceps',     cx: 28,  cy: 142, rx: 11, ry: 22 },
  { muscleId: 'triceps',     cx: 172, cy: 142, rx: 11, ry: 22 },
  { muscleId: 'lombar',      cx: 100, cy: 200, rx: 21, ry: 17 },
  { muscleId: 'gluteos',     cx: 76,  cy: 246, rx: 22, ry: 22 },
  { muscleId: 'gluteos',     cx: 124, cy: 246, rx: 22, ry: 22 },
  { muscleId: 'posteriores', cx: 75,  cy: 300, rx: 20, ry: 34 },
  { muscleId: 'posteriores', cx: 125, cy: 300, rx: 20, ry: 34 },
  { muscleId: 'panturrilha', cx: 73,  cy: 368, rx: 14, ry: 27 },
  { muscleId: 'panturrilha', cx: 127, cy: 368, rx: 14, ry: 27 },
];

// Centroid label position per unique muscle (front)
const FRONT_LABEL: Record<string, { x: number; y: number }> = {
  ombros:     { x: 100, y: 79 },
  peito:      { x: 100, y: 122 },
  biceps:     { x: 28,  y: 145 },
  antebraco:  { x: 21,  y: 187 },
  abdomen:    { x: 100, y: 175 },
  quadriceps: { x: 100, y: 284 },
  panturrilha:{ x: 100, y: 365 },
};

// Centroid label position per unique muscle (back)
const BACK_LABEL: Record<string, { x: number; y: number }> = {
  trapezio:   { x: 100, y: 90 },
  costas:     { x: 100, y: 148 },
  triceps:    { x: 28,  y: 142 },
  lombar:     { x: 100, y: 200 },
  gluteos:    { x: 100, y: 246 },
  posteriores:{ x: 100, y: 300 },
  panturrilha:{ x: 100, y: 368 },
};

function levelFill(level: number): string {
  if (level >= 10) return '#eab308';
  if (level >= 7)  return '#a855f7';
  if (level >= 5)  return '#7c3aed';
  if (level >= 3)  return '#3b82f6';
  if (level >= 2)  return '#1e40af';
  return '#1a2d50';
}

function levelOpacity(level: number): number {
  if (level >= 5)  return 0.88;
  if (level >= 3)  return 0.72;
  if (level >= 2)  return 0.55;
  return 0.35;
}

function levelGlowId(level: number): string {
  if (level >= 10) return 'url(#glow-gold)';
  if (level >= 5)  return 'url(#glow-purple)';
  return 'none';
}

// Static body silhouette — same SVG shapes for both front/back
function BodySilhouette() {
  const fill = '#0f1e36';
  const stroke = '#1e3055';
  return (
    <g fill={fill} stroke={stroke} strokeWidth="1.2">
      <circle cx="100" cy="36" r="27" />
      <rect x="91" y="60" width="18" height="16" rx="7" />
      <rect x="40" y="74" width="47" height="21" rx="10" />
      <rect x="113" y="74" width="47" height="21" rx="10" />
      <rect x="55" y="91" width="90" height="52" rx="14" />
      <rect x="63" y="138" width="74" height="64" rx="12" />
      <rect x="57" y="196" width="86" height="28" rx="14" />
      <rect x="26" y="82" width="20" height="64" rx="10" />
      <rect x="154" y="82" width="20" height="64" rx="10" />
      <rect x="18" y="150" width="18" height="56" rx="9" />
      <rect x="164" y="150" width="18" height="56" rx="9" />
      <ellipse cx="27"  cy="215" rx="13" ry="10" />
      <ellipse cx="173" cy="215" rx="13" ry="10" />
      <rect x="57"  y="220" width="34" height="84" rx="17" />
      <rect x="109" y="220" width="34" height="84" rx="17" />
      <ellipse cx="74"  cy="306" rx="19" ry="12" />
      <ellipse cx="126" cy="306" rx="19" ry="12" />
      <rect x="59"  y="314" width="28" height="74" rx="14" />
      <rect x="113" y="314" width="28" height="74" rx="14" />
      <ellipse cx="74"  cy="397" rx="23" ry="11" />
      <ellipse cx="126" cy="397" rx="23" ry="11" />
    </g>
  );
}

export function BodyMap() {
  const { muscles } = useGameStore();
  const [flipped, setFlipped] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const muscleMap = Object.fromEntries(muscles.map(m => [m.id, m]));

  function handleMouseEnter(muscleId: string, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredId(muscleId);
    setTooltip({
      muscleId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!tooltip) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }

  function handleMouseLeave() {
    setHoveredId(null);
    setTooltip(null);
  }

  function renderRegions(regions: Region[], labels: Record<string, { x: number; y: number }>) {
    const drawnLabels = new Set<string>();
    return regions.map((r, i) => {
      const muscle = muscleMap[r.muscleId];
      const level = muscle?.level ?? 1;
      const isHovered = hoveredId === r.muscleId;
      const fill = levelFill(level);
      const opacity = isHovered ? Math.min(1, levelOpacity(level) + 0.15) : levelOpacity(level);
      const filter = isHovered ? 'url(#glow-hover)' : levelGlowId(level);

      const showLabel = labels[r.muscleId] && !drawnLabels.has(r.muscleId);
      if (showLabel) drawnLabels.add(r.muscleId);
      const lp = labels[r.muscleId];

      return (
        <g key={`${r.muscleId}-${i}`}>
          <ellipse
            cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill={fill} opacity={opacity} filter={filter}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={e => handleMouseEnter(r.muscleId, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {showLabel && lp && (
            <g
              style={{ cursor: 'pointer', pointerEvents: 'none' }}
            >
              <circle cx={lp.x} cy={lp.y} r="9"
                fill="#060913" stroke={fill} strokeWidth="1.5" opacity={0.95} />
              <text x={lp.x} y={lp.y + 4}
                textAnchor="middle" fontSize="8" fontWeight="800"
                fill={fill} style={{ userSelect: 'none' }}>
                {level}
              </text>
            </g>
          )}
        </g>
      );
    });
  }

  const tooltipMuscle = tooltip ? muscleMap[tooltip.muscleId] : null;
  const tooltipXPReq = tooltipMuscle ? xpForMuscleLevel(tooltipMuscle.level) : 1;

  return (
    <div ref={containerRef} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
            🫀 Mapa Muscular
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
            {flipped ? 'Vista posterior' : 'Vista frontal'} — passe o mouse para ver detalhes
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ gap: 6, fontSize: 13, padding: '8px 14px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <RotateCcw size={14} style={{
            transition: 'transform 0.4s',
            transform: flipped ? 'rotate(180deg)' : 'rotate(0deg)',
          }} />
          {flipped ? 'Ver Frente' : 'Ver Costas'}
        </button>
      </div>

      {/* 3D flip container */}
      <div style={{ perspective: '900px', width: '100%' }}>
        <div style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          height: 420,
        }}>
          {/* FRONT */}
          <div style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            position: 'absolute', inset: 0,
            display: 'flex', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 200 410" width="200" height="410" style={{ overflow: 'visible' }}>
              <defs>
                <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-hover" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <BodySilhouette />
              {renderRegions(FRONT_REGIONS, FRONT_LABEL)}
            </svg>
          </div>

          {/* BACK */}
          <div style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            position: 'absolute', inset: 0,
            transform: 'rotateY(180deg)',
            display: 'flex', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 200 410" width="200" height="410" style={{ overflow: 'visible' }}>
              <defs>
                <filter id="glow-gold-b" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-purple-b" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-hover-b" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <BodySilhouette />
              {renderRegions(BACK_REGIONS, BACK_LABEL)}
            </svg>
          </div>
        </div>
      </div>

      {/* Level legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
        {[
          { label: 'Lv 1', color: '#1a2d50' },
          { label: 'Lv 2', color: '#1e40af' },
          { label: 'Lv 3-4', color: '#3b82f6' },
          { label: 'Lv 5-6', color: '#7c3aed' },
          { label: 'Lv 7-9', color: '#a855f7' },
          { label: 'Lv 10+', color: '#eab308' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && tooltipMuscle && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 14,
          top: tooltip.y - 10,
          zIndex: 50,
          background: '#111827',
          border: `1px solid ${levelFill(tooltipMuscle.level)}60`,
          borderRadius: 10,
          padding: '10px 14px',
          minWidth: 160,
          pointerEvents: 'none',
          boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 12px ${levelFill(tooltipMuscle.level)}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{tooltipMuscle.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{tooltipMuscle.name}</div>
              <div style={{ fontSize: 11, color: levelFill(tooltipMuscle.level), fontWeight: 700 }}>
                Nível {tooltipMuscle.level}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
              <span>{tooltipMuscle.currentXP} XP</span>
              <span>{tooltipXPReq} XP</span>
            </div>
            <div style={{ height: 5, background: '#1e2d4a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.floor((tooltipMuscle.currentXP / tooltipXPReq) * 100))}%`,
                background: levelFill(tooltipMuscle.level),
                borderRadius: 3,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {tooltipXPReq - tooltipMuscle.currentXP} XP para nível {tooltipMuscle.level + 1}
          </div>
        </div>
      )}
    </div>
  );
}
