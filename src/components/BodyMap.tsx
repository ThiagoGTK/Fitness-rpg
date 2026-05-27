import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { xpForMuscleLevel } from '../services/levelCalculator';

// ─── Configuração de crop da imagem ────────────────────────────────────────
// Se o corpo ficar descentralizado, ajuste esses valores.
// body-male.png deve estar em /public/body-male.png
// A imagem combina frente (esquerda) e costas (direita) na mesma foto.
const CROP = {
  // background-size: 'auto 100%' escala pela altura do container
  front: { pos: '-8px center'  },  // mostra metade esquerda (frente)
  back:  { pos: '-182px center' }, // mostra metade direita (costas)
};

// ─── Posição dos badges por músculo (% do container) ────────────────────────
// Container: largura ~170px, altura ~350px
// Ajuste x/y se precisar reposicionar um badge específico
interface BadgePos { muscleId: string; x: number; y: number }

const FRONT_BADGES: BadgePos[] = [
  { muscleId: 'shoulders',  x: 15,  y: 19 },
  { muscleId: 'shoulders',  x: 85,  y: 19 },
  { muscleId: 'chest',      x: 50,  y: 29 },
  { muscleId: 'biceps',     x: 9,   y: 40 },
  { muscleId: 'biceps',     x: 91,  y: 40 },
  { muscleId: 'forearms',   x: 7,   y: 53 },
  { muscleId: 'forearms',   x: 93,  y: 53 },
  { muscleId: 'core',       x: 50,  y: 51 },
  { muscleId: 'quadriceps', x: 34,  y: 70 },
  { muscleId: 'quadriceps', x: 66,  y: 70 },
  { muscleId: 'calves',     x: 34,  y: 87 },
  { muscleId: 'calves',     x: 66,  y: 87 },
];

const BACK_BADGES: BadgePos[] = [
  { muscleId: 'traps',      x: 50,  y: 13 },
  { muscleId: 'lats',       x: 28,  y: 30 },
  { muscleId: 'lats',       x: 72,  y: 30 },
  { muscleId: 'back',       x: 50,  y: 39 },
  { muscleId: 'triceps',    x: 10,  y: 38 },
  { muscleId: 'triceps',    x: 90,  y: 38 },
  { muscleId: 'glutes',     x: 50,  y: 60 },
  { muscleId: 'hamstrings', x: 34,  y: 72 },
  { muscleId: 'hamstrings', x: 66,  y: 72 },
  { muscleId: 'calves',     x: 34,  y: 87 },
  { muscleId: 'calves',     x: 66,  y: 87 },
];

// ─── Cor de calor por nível ───────────────────────────────────────────────
function heatColor(level: number) {
  if (level >= 10) return '#eab308';
  if (level >= 7)  return '#f97316';
  if (level >= 5)  return '#a855f7';
  if (level >= 3)  return '#3b82f6';
  return '#334155';
}

// ─── Silhueta SVG feminina (usada quando sex === 'female') ────────────────
function FemaleSilhouette() {
  const fill = '#0f1e36'; const stroke = '#1e3055';
  return (
    <g fill={fill} stroke={stroke} strokeWidth="1.2">
      {/* Cabeça */}
      <ellipse cx="100" cy="34" rx="22" ry="26" />
      {/* Pescoço */}
      <rect x="93" y="58" width="14" height="14" rx="6" />
      {/* Ombros (mais estreitos) */}
      <ellipse cx="62"  cy="77" rx="20" ry="12" />
      <ellipse cx="138" cy="77" rx="20" ry="12" />
      {/* Clavícula / topo do torso */}
      <rect x="68" y="85" width="64" height="14" rx="7" />
      {/* Busto */}
      <ellipse cx="83"  cy="105" rx="16" ry="14" />
      <ellipse cx="117" cy="105" rx="16" ry="14" />
      {/* Torso superior */}
      <rect x="65" y="90" width="70" height="30" rx="10" />
      {/* Cintura (estreita) */}
      <rect x="72" y="118" width="56" height="34" rx="8" />
      {/* Quadril (mais largo) */}
      <ellipse cx="100" cy="162" rx="52" ry="18" />
      <rect x="52" y="156" width="96" height="42" rx="14" />
      {/* Braços superiores */}
      <rect x="24" y="74"  width="18" height="68" rx="9" />
      <rect x="158" y="74" width="18" height="68" rx="9" />
      {/* Antebraços */}
      <rect x="16" y="146" width="16" height="54" rx="8" />
      <rect x="168" y="146" width="16" height="54" rx="8" />
      {/* Mãos */}
      <ellipse cx="24"  cy="209" rx="11" ry="9" />
      <ellipse cx="176" cy="209" rx="11" ry="9" />
      {/* Coxas (mais arredondadas) */}
      <rect x="54" y="196" width="38" height="86" rx="19" />
      <rect x="108" y="196" width="38" height="86" rx="19" />
      {/* Joelhos */}
      <ellipse cx="73"  cy="285" rx="17" ry="10" />
      <ellipse cx="127" cy="285" rx="17" ry="10" />
      {/* Panturrilhas (mais finas) */}
      <rect x="59" y="293"  width="26" height="74" rx="13" />
      <rect x="115" y="293" width="26" height="74" rx="13" />
      {/* Tornozelos */}
      <ellipse cx="72"  cy="378" rx="18" ry="8" />
      <ellipse cx="128" cy="378" rx="18" ry="8" />
    </g>
  );
}

// Vista de costas da silhueta feminina
function FemaleSilhouetteBack() {
  const fill = '#0f1e36'; const stroke = '#1e3055';
  return (
    <g fill={fill} stroke={stroke} strokeWidth="1.2">
      <ellipse cx="100" cy="34" rx="22" ry="26" />
      <rect x="93" y="58" width="14" height="14" rx="6" />
      <ellipse cx="62"  cy="77" rx="20" ry="12" />
      <ellipse cx="138" cy="77" rx="20" ry="12" />
      <rect x="65" y="85" width="70" height="55" rx="10" />
      <rect x="72" y="136" width="56" height="24" rx="8" />
      <ellipse cx="100" cy="170" rx="52" ry="18" />
      <rect x="52" y="162" width="96" height="38" rx="10" />
      {/* Glúteos arredondados */}
      <ellipse cx="80"  cy="200" rx="26" ry="20" />
      <ellipse cx="120" cy="200" rx="26" ry="20" />
      <rect x="24" y="74"  width="18" height="68" rx="9" />
      <rect x="158" y="74" width="18" height="68" rx="9" />
      <rect x="16" y="146" width="16" height="54" rx="8" />
      <rect x="168" y="146" width="16" height="54" rx="8" />
      <ellipse cx="24"  cy="209" rx="11" ry="9" />
      <ellipse cx="176" cy="209" rx="11" ry="9" />
      <rect x="54" y="210" width="38" height="76" rx="19" />
      <rect x="108" y="210" width="38" height="76" rx="19" />
      <ellipse cx="73"  cy="289" rx="17" ry="10" />
      <ellipse cx="127" cy="289" rx="17" ry="10" />
      <rect x="59" y="297"  width="26" height="70" rx="13" />
      <rect x="115" y="297" width="26" height="70" rx="13" />
      <ellipse cx="72"  cy="377" rx="18" ry="8" />
      <ellipse cx="128" cy="377" rx="18" ry="8" />
    </g>
  );
}

// ─── Painel de imagem (masculino) ─────────────────────────────────────────
function ImagePanel({
  side, badges, muscleMap, hovered, onEnter, onLeave,
}: {
  side: 'front' | 'back';
  badges: BadgePos[];
  muscleMap: Record<string, { level: number; name: string; icon: string; currentXP: number }>;
  hovered: string | null;
  onEnter: (id: string) => void;
  onLeave: () => void;
}) {
  const crop = CROP[side];
  return (
    <div className="bodymap-svg" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Corpo realista */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 12,
        backgroundImage: 'url(/body-male.png)',
        backgroundSize: 'auto 100%',
        backgroundPosition: crop.pos,
        backgroundRepeat: 'no-repeat',
        // Fallback: fundo escuro se imagem não carregada
        backgroundColor: '#0d1526',
      }} />
      {/* Badges de nível */}
      {badges.map((b, i) => {
        const m = muscleMap[b.muscleId];
        if (!m) return null;
        const color = heatColor(m.level);
        const isHov = hovered === `${b.muscleId}-${i}`;
        return (
          <div
            key={i}
            onMouseEnter={() => onEnter(`${b.muscleId}-${i}`)}
            onMouseLeave={onLeave}
            style={{
              position: 'absolute',
              left: `${b.x}%`, top: `${b.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `${color}dd`,
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: 'white',
              cursor: 'pointer',
              boxShadow: isHov
                ? `0 0 14px ${color}, 0 0 4px ${color}`
                : `0 0 6px ${color}80`,
              transition: 'all 0.15s',
              transform: isHov ? 'scale(1.35)' : 'scale(1)',
            }}>
              {m.level}
            </div>
            {/* Tooltip */}
            {isHov && (
              <MuscleTip muscle={m} color={color} xLeft={b.x < 50} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Painel SVG feminino ────────────────────────────────────────────────
function SvgPanel({
  side, badges, muscleMap, hovered, onEnter, onLeave,
}: {
  side: 'front' | 'back';
  badges: BadgePos[];
  muscleMap: Record<string, { level: number; name: string; icon: string; currentXP: number }>;
  hovered: string | null;
  onEnter: (id: string) => void;
  onLeave: () => void;
}) {
  return (
    <div className="bodymap-svg" style={{ position: 'relative', overflow: 'visible' }}>
      <svg viewBox="0 0 200 410" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <filter id={`glow-f-${side}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {side === 'front' ? <FemaleSilhouette /> : <FemaleSilhouetteBack />}
        {/* Overlay muscles com calor */}
        {badges.map((b, i) => {
          const m = muscleMap[b.muscleId];
          if (!m || m.level < 2) return null;
          const color = heatColor(m.level);
          // Converter % para coordenadas SVG (viewBox 200x410)
          const cx = (b.x / 100) * 200;
          const cy = (b.y / 100) * 410;
          return (
            <ellipse key={i} cx={cx} cy={cy} rx={16} ry={12}
              fill={color} opacity={0.35}
              filter={`url(#glow-f-${side})`}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </svg>
      {/* Badges */}
      {badges.map((b, i) => {
        const m = muscleMap[b.muscleId];
        if (!m) return null;
        const color = heatColor(m.level);
        const isHov = hovered === `${b.muscleId}-${i}`;
        return (
          <div
            key={i}
            onMouseEnter={() => onEnter(`${b.muscleId}-${i}`)}
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
              background: `${color}dd`,
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 800, color: 'white',
              cursor: 'pointer',
              boxShadow: isHov ? `0 0 10px ${color}` : `0 0 5px ${color}80`,
              transition: 'all 0.15s',
              transform: isHov ? 'scale(1.35)' : 'scale(1)',
            }}>
              {m.level}
            </div>
            {isHov && <MuscleTip muscle={m} color={color} xLeft={b.x < 50} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tooltip flutuante ────────────────────────────────────────────────────
function MuscleTip({ muscle, color, xLeft }: {
  muscle: { level: number; name: string; icon: string; currentXP: number };
  color: string;
  xLeft: boolean;
}) {
  const req = xpForMuscleLevel(muscle.level);
  return (
    <div style={{
      position: 'absolute',
      bottom: '130%',
      left: xLeft ? 0 : 'auto',
      right: xLeft ? 'auto' : 0,
      background: '#111827',
      border: `1px solid ${color}50`,
      borderRadius: 10, padding: '8px 12px',
      whiteSpace: 'nowrap', fontSize: 11,
      color: '#f1f5f9', zIndex: 30,
      pointerEvents: 'none',
      boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
      minWidth: 140,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{muscle.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{muscle.name}</div>
          <div style={{ color, fontWeight: 700, fontSize: 10 }}>Nível {muscle.level}</div>
        </div>
      </div>
      {/* XP bar */}
      <div style={{ height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
        <div style={{
          height: '100%', borderRadius: 2, background: color,
          width: `${Math.min(100, Math.round((muscle.currentXP / req) * 100))}%`,
        }} />
      </div>
      <div style={{ fontSize: 10, color: '#64748b' }}>
        {muscle.currentXP} / {req} XP
      </div>
    </div>
  );
}

// ─── Legenda de calor ─────────────────────────────────────────────────────
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

  const muscleMap = Object.fromEntries(
    muscles.map(m => [m.id, { level: m.level, name: m.name, icon: m.icon, currentXP: m.currentXP }])
  );

  const isFemale = user.sex === 'female';

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
          🫀 Mapa Muscular
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
          Passe o mouse sobre um músculo para ver detalhes
        </p>
      </div>

      {/* Front + Back */}
      <div className="bodymap-views">
        {/* Frente */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase' }}>
            Frente
          </span>
          {isFemale
            ? <SvgPanel side="front" badges={FRONT_BADGES} muscleMap={muscleMap} hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
            : <ImagePanel side="front" badges={FRONT_BADGES} muscleMap={muscleMap} hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
          }
        </div>

        <div className="bodymap-divider" />

        {/* Costas */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase' }}>
            Costas
          </span>
          {isFemale
            ? <SvgPanel side="back" badges={BACK_BADGES} muscleMap={muscleMap} hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
            : <ImagePanel side="back" badges={BACK_BADGES} muscleMap={muscleMap} hovered={hovered} onEnter={setHovered} onLeave={() => setHovered(null)} />
          }
        </div>
      </div>

      {/* Legenda */}
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
