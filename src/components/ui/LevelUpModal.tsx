import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { LevelUpEvent } from '../../types';

function SingleLevelUp({ event, onDismiss }: { event: LevelUpEvent; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const icon = event.type === 'muscle' ? '💪' : '🏋️';
  const label = event.type === 'muscle' ? 'MÚSCULO EVOLUIU!' : 'EXERCÍCIO EVOLUIU!';

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', pointerEvents: 'none',
      }}
    >
      <div
        className="modal-content level-up-glow"
        style={{
          background: 'linear-gradient(135deg, #111827, #1a1a3a)',
          border: '2px solid #eab308',
          borderRadius: 20,
          padding: '40px 60px',
          textAlign: 'center',
          maxWidth: 360,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 8 }}>⭐</div>
        <div style={{ color: '#eab308', fontSize: 13, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
          {icon} {event.entityName}
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#eab308', lineHeight: 1 }}>
          NÍVEL {event.newLevel}
        </div>
        <button
          onClick={onDismiss}
          style={{
            marginTop: 24, background: '#eab308', color: '#000', border: 'none',
            borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          CONTINUAR
        </button>
      </div>
    </div>
  );
}

export function LevelUpModal() {
  const { pendingLevelUps, dismissLevelUp } = useGameStore();
  if (pendingLevelUps.length === 0) return null;

  return (
    <SingleLevelUp
      key={pendingLevelUps[0].id}
      event={pendingLevelUps[0]}
      onDismiss={() => dismissLevelUp(pendingLevelUps[0].id)}
    />
  );
}
