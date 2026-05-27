import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { xpForMuscleLevel } from '../services/levelCalculator';

// ─── Crop da imagem realista (ajuste se necessário) ────────────────────────
// Salve a imagem combinada (frente+costas) como /public/body-male.png
// A imagem é mostrada SOBRE o SVG quando o arquivo existir.
const IMG_CROP = {
  front: '-8px center',   // background-position para metade esquerda
  back:  '-182px center', // background-position para metade direita
};

// ─── Posições dos badges (% do container) ─────────────────────────────────
interface BadgePos { muscleId: string; x: number; y: number }

const FRONT_BADGES: BadgePos[] = [
  { muscleId: 'shoulders',  x: 16, y: 19 },
  { muscleId: 'shoulders',  x: 84, y: 19 },
  { muscleId: 'chest',      x: 50, y: 29 },
  { muscleId: 'biceps',     x: 10, y: 40 },
  { muscleId: 'biceps',     x: 90, y: 40 },
  { muscleId: 'forearms',   x: 8,  y: 53 },
  { muscleId: 'forearms',   x: 92, y: 53 },
  { muscleId: 'core',       x: 50, y: 51 },
  { muscleId: 'quadriceps', x: 35, y: 70 },
  { muscleId: 'quadriceps', x: 65, y: 70 },
  { muscleId: 'calves',     x: 35, y: 87 },
  { muscleId: 'calves',     x: 65, y: 87 },
];

const BACK_BADGES: BadgePos[] = [
  { muscleId: 'traps',      x: 50, y: 13 },
  { muscleId: 'lats',       x: 28, y: 30 },
  { muscleId: 'lats',       x: 72, y: 30 },
  { muscleId: 'back',       x: 50, y: 39 },
  { muscleId: 'triceps',    x: 11, y: 38 },
  { muscleId: 'triceps',    x: 89, y: 38 },
  { muscleId: 'glutes',     x: 50, y: 60 },
  { muscleId: 'hamstrings', x: 35, y: 72 },
  { muscleId: 'hamstrings', x: 65, y: 72 },
  { muscleId: 'calves',     x: 35, y: 87 },
  { muscleId: 'calves',     x: 65, y: 87 },
];

// Mapeamento muscle ID → região SVG (cx, cy, rx, ry no viewBox 200x420)
const MUSCLE_REGIONS_FRONT: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  chest:      { cx: 100, cy: 116, rx: 32, ry: 22 },
  shoulders:  { cx: 100, cy: 84,  rx: 50, ry: 10 },
  biceps:     { cx: 100, cy: 148, rx: 40, ry: 14 },
  forearms:   { cx: 100, cy: 183, rx: 36, ry: 14 },
  core:       { cx: 100, cy: 168, rx: 26, ry: 28 },
  quadriceps: { cx: 100, cy: 280, rx: 36, ry: 36 },
  calves:     { cx: 100, cy: 366, rx: 30, ry: 24 },
};

const MUSCLE_REGIONS_BACK: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  traps:      { cx: 100, cy: 88,  rx: 34, ry: 18 },
  lats:       { cx: 100, cy: 148, rx: 44, ry: 30 },
  back:       { cx: 100, cy: 192, rx: 24, ry: 22 },
  triceps:    { cx: 100, cy: 150, rx: 42, ry: 16 },
  glutes:     { cx: 100, cy: 248, rx: 38, ry: 22 },
  hamstrings: { cx: 100, cy: 298, rx: 34, ry: 30 },
  calves:     { cx: 100, cy: 370, rx: 28, ry: 24 },
};

// ─── Cor de calor por nível ───────────────────────────────────────────────
function heatColor(level: number) {
  if (level >= 10) return '#eab308';
  if (level >= 7)  return '#f97316';
  if (level >= 5)  return '#a855f7';
  if (level >= 3)  return '#3b82f6';
  return '#334155';
}

type MuscleData = Record<string, { level: number; name: string; icon: string; currentXP: number }>;

// ─── Silhueta masculina ────────────────────────────────────────────────────
function MaleSilhouette({ side, muscleMap }: { side: 'front' | 'back'; muscleMap: MuscleData }) {
  const regions = side === 'front' ? MUSCLE_REGIONS_FRONT : MUSCLE_REGIONS_BACK;
  const f = '#0e1929'; const s = '#1e3055';

  return (
    <>
      <defs>
        <filter id={`glow-m-${side}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Silhueta base */}
      <g fill={f} stroke={s} strokeWidth="1.2">
        {/* Cabeça */}
        <ellipse cx="100" cy="33" rx="24" ry="28" />
        {/* Pescoço */}
        <rect x="91" y="58" width="18" height="16" rx="7" />
        {/* Ombros largos */}
        <ellipse cx="52"  cy="78" rx="28" ry="14" />
        <ellipse cx="148" cy="78" rx="28" ry="14" />
        {/* Torso / peitoral */}
        {side === 'front' && <>
          <rect x="60" y="86" width="80" height="50" rx="12" />
          {/* Pecs */}
          <ellipse cx="81"  cy="108" rx="18" ry="16" fill="#121f35" />
          <ellipse cx="119" cy="108" rx="18" ry="16" fill="#121f35" />
          {/* Abs */}
          <rect x="68" y="132" width="64" height="60" rx="8" />
          {/* Obliques */}
          <rect x="57" y="150" width="86" height="20" rx="8" />
        </>}
        {side === 'back' && <>
          <rect x="60" y="86" width="80" height="52" rx="12" />
          {/* Lats */}
          <ellipse cx="72"  cy="142" rx="26" ry="32" fill="#121f35" />
          <ellipse cx="128" cy="142" rx="26" ry="32" fill="#121f35" />
          {/* Lombar */}
          <rect x="74" y="176" width="52" height="26" rx="8" />
        </>}
        {/* Cintura/quadril */}
        <rect x="64" y="190" width="72" height="36" rx="10" />
        {side === 'back' && <>
          {/* Glúteos */}
          <ellipse cx="81"  cy="238" rx="22" ry="20" fill="#121f35" />
          <ellipse cx="119" cy="238" rx="22" ry="20" fill="#121f35" />
        </>}
        {/* Braços superiores */}
        <rect x="22"  y="76" width="20" height="76" rx="10" />
        <rect x="158" y="76" width="20" height="76" rx="10" />
        {/* Antebraços */}
        <rect x="14"  width="18" height="62" rx="9" y="156" />
        <rect x="168" width="18" height="62" rx="9" y="156" />
        {/* Mãos */}
        <ellipse cx="23"  cy="228" rx="14" ry="10" />
        <ellipse cx="177" cy="228" rx="14" ry="10" />
        {/* Coxas */}
        <rect x="62"  y="224" width="34" height="90" rx="17" />
        <rect x="104" y="224" width="34" height="90" rx="17" />
        {/* Joelhos */}
        <ellipse cx="79"  cy="317" rx="21" ry="12" />
        <ellipse cx="121" cy="317" rx="21" ry="12" />
        {/* Panturrilhas */}
        <rect x="63"  y="327" width="28" height="76" rx="14" />
        <rect x="109" y="327" width="28" height="76" rx="14" />
        {/* Pés */}
        <ellipse cx="77"  cy="413" rx="23" ry="10" />
        <ellipse cx="123" cy="413" rx="23" ry="10" />
      </g>

      {/* Overlays de calor muscular */}
      {Object.entries(regions).map(([id, r]) => {
        const m = muscleMap[id];
        if (!m || m.level < 2) return null;
        const color = heatColor(m.level);
        const opacity = m.level >= 7 ? 0.55 : m.level >= 5 ? 0.42 : m.level >= 3 ? 0.30 : 0;
        return (
          <ellipse key={id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill={color} opacity={opacity}
            filter={`url(#glow-m-${side})`}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </>
  );
}

// ─── Silhueta feminina ────────────────────────────────────────────────────
function FemaleSilhouette({ side, muscleMap }: { side: 'front' | 'back'; muscleMap: MuscleData }) {
  const regions = side === 'front' ? MUSCLE_REGIONS_FRONT : MUSCLE_REGIONS_BACK;
  const f = '#0e1929'; const s = '#1e3055';
  return (
    <>
      <defs>
        <filter id={`glow-f-${side}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g fill={f} stroke={s} strokeWidth="1.2">
        <ellipse cx="100" cy="34" rx="22" ry="26" />
        <rect x="93" y="58" width="14" height="14" rx="6" />
        <ellipse cx="62"  cy="77" rx="20" ry="12" />
        <ellipse cx="138" cy="77" rx="20" ry="12" />
        {side === 'front' && <>
          <ellipse cx="83"  cy="107" rx="17" ry="14" />
          <ellipse cx="117" cy="107" rx="17" ry="14" />
          <rect x="66" y="88" width="68" height="34" rx="10" />
          <rect x="73" y="120" width="54" height="34" rx="8" />
          <rect x="57" y="148" width="86" height="28" rx="12" />
        </>}
        {side === 'back' && <>
          <rect x="64" y="86" width="72" height="56" rx="10" />
          <ellipse cx="76"  cy="146" rx="22" ry="28" fill="#121f35" />
          <ellipse cx="124" cy="146" rx="22" ry="28" fill="#121f35" />
          <rect x="75" y="172" width="50" height="24" rx="8" />
          <ellipse cx="82"  cy="230" rx="24" ry="20" fill="#121f35" />
          <ellipse cx="118" cy="230" rx="24" ry="20" fill="#121f35" />
        </>}
        <ellipse cx="100" cy="174" rx="50" ry="18" />
        <rect x="55" y="168" width="90" height="40" rx="12" />
        <rect x="24"  y="76" width="18" height="70" rx="9" />
        <rect x="158" y="76" width="18" height="70" rx="9" />
        <rect x="16"  y="150" width="16" height="56" rx="8" />
        <rect x="168" y="150" width="16" height="56" rx="8" />
        <ellipse cx="24"  cy="216" rx="12" ry="9" />
        <ellipse cx="176" cy="216" rx="12" ry="9" />
        <rect x="56"  y="206" width="36" height="88" rx="18" />
        <rect x="108" y="206" width="36" height="88" rx="18" />
        <ellipse cx="74"  cy="297" rx="18" ry="11" />
        <ellipse cx="126" cy="297" rx="18" ry="11" />
        <rect x="60"  y="305" width="26" height="72" rx="13" />
        <rect x="114" y="305" width="26" height="72" rx="13" />
        <ellipse cx="73"  cy="387" rx="19" ry="9" />
        <ellipse cx="127" cy="387" rx="19" ry="9" />
      </g>
      {Object.entries(regions).map(([id, r]) => {
        const m = muscleMap[id];
        if (!m || m.level < 2) return null;
        const color = heatColor(m.level);
        const opacity = m.level >= 7 ? 0.55 : m.level >= 5 ? 0.42 : m.level >= 3 ? 0.30 : 0;
        return (
          <ellipse key={id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill={color} opacity={opacity}
            filter={`url(#glow-f-${side})`}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────
function Tooltip({ m, color, left }: {
  m: { level: number; name: string; icon: string; currentXP: number };
  color: string; left: boolean;
}) {
  const req = xpForMuscleLevel(m.level);
  return (
    <div style={{
      position: 'absolute', bottom: '130%',
      left: left ? 0 : 'auto', right: left ? 'auto' : 0,
      background: '#111827', border: `1px solid ${color}50`,
      borderRadius: 10, padding: '8px 12px',
      whiteSpace: 'nowrap', fontSize: 11, color: '#f1f5f9',
      zIndex: 30, pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      minWidth: 148,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{m.icon}</span>
        <div>
          <div style={{ fontWeight: 700 }}>{m.name}</div>
          <div style={{ color, fontWeight: 700, fontSize: 10 }}>Nível {m.level}</div>
        </div>
      </div>
      <div style={{ height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${Math.min(100, Math.round((m.currentXP / req) * 100))}%` }} />
      </div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{m.currentXP} / {req} XP</div>
    </div>
  );
}

// ─── Painel único (SVG base + imagem overlay + badges) ────────────────────
function BodyPanel({ side, isFemale, badges, muscleMap, hovered, onEnter, onLeave }: {
  side: 'front' | 'back';
  isFemale: boolean;
  badges: BadgePos[];
  muscleMap: MuscleData;
  hovered: string | null;
  onEnter: (id: string) => void;
  onLeave: () => void;
}) {
  return (
    <div className="bodymap-svg" style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      {/* Camada 1: SVG (sempre visível) */}
      <svg viewBox="0 0 200 424" style={{ width: '100%', height: '100%', display: 'block' }}>
        {isFemale
          ? <FemaleSilhouette side={side} muscleMap={muscleMap} />
          : <MaleSilhouette   side={side} muscleMap={muscleMap} />
        }
      </svg>

      {/* Camada 2: imagem realista (sobreposta quando o arquivo existir) */}
      {!isFemale && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/body-male.png)',
          backgroundSize: 'auto 100%',
          backgroundPosition: IMG_CROP[side],
          backgroundRepeat: 'no-repeat',
          // sem background-color → transparente se imagem não carregar
        }} />
      )}

      {/* Camada 3: badges de nível */}
      {badges.map((b, i) => {
        const m = muscleMap[b.muscleId];
        if (!m) return null;
        const color = heatColor(m.level);
        const key = `${b.muscleId}-${i}`;
        const isHov = hovered === key;
        return (
          <div
            key={key}
            onMouseEnter={() => onEnter(key)}
            onMouseLeave={onLeave}
            style={{
              position: 'absolute',
              left: `${b.x}%`, top: `${b.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: `${color}e0`,
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 800, color: 'white',
              cursor: 'pointer',
              boxShadow: isHov ? `0 0 12px ${color}, 0 0 4px ${color}` : `0 0 5px ${color}80`,
              transition: 'all 0.15s',
              transform: isHov ? 'scale(1.4)' : 'scale(1)',
            }}>
              {m.level}
            </div>
            {isHov && <Tooltip m={m} color={color} left={b.x < 50} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Legenda ──────────────────────────────────────────────────────────────
const LEGEND = [
  { label: 'Lv 1–2', color: '#334155' },
  { label: 'Lv 3–4', color: '#3b82f6' },
  { label: 'Lv 5–6', color: '#a855f7' },
  { label: 'Lv 7–9', color: '#f97316' },
  { label: 'Lv 10+', color: '#eab308' },
];

// ─── Componente principal ─────────────────────────────────────────────────
export function BodyMap() {
  const { muscles, user } = useGameStore();
  const [hovered, setHovered] = useState<string | null>(null);

  const muscleMap: MuscleData = Object.fromEntries(
    muscles.map(m => [m.id, { level: m.level, name: m.name, icon: m.icon, currentXP: m.currentXP }])
  );

  const isFemale = user.sex === 'female';

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🫀 Mapa Muscular</h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
          Passe o mouse sobre um músculo para ver detalhes
        </p>
      </div>

      <div className="bodymap-views">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase' }}>Frente</span>
          <BodyPanel side="front" isFemale={isFemale} badges={FRONT_BADGES} muscleMap={muscleMap}
            hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
        </div>

        <div className="bodymap-divider" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase' }}>Costas</span>
          <BodyPanel side="back" isFemale={isFemale} badges={BACK_BADGES} muscleMap={muscleMap}
            hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
        {LEGEND.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
